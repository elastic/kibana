/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import * as ast from '../ast';
import * as literal from '../node_types/literal';
import * as wildcard from '../node_types/wildcard';
import { getPhraseScript } from '../../filter_manager/lib/phrase';
import { getFields } from './utils/get_fields';

export function buildNodeParams(fieldName, value, isPhrase = false) {
  if (_.isUndefined(fieldName)) {
    throw new Error('fieldName is a required argument');
  }
  if (_.isUndefined(value)) {
    throw new Error('value is a required argument');
  }

  const fieldNode = typeof fieldName === 'string' ? ast.fromLiteralExpression(fieldName) : literal.buildNode(fieldName);
  const valueNode = typeof value === 'string' ? ast.fromLiteralExpression(value) : literal.buildNode(value);
  const isPhraseNode = literal.buildNode(isPhrase);

  return {
    arguments: [fieldNode, valueNode, isPhraseNode],
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const { arguments: [ fieldNameArg, valueArg, isPhraseArg ] } = node;

  const value = !_.isUndefined(valueArg) ? ast.toElasticsearchQuery(valueArg) : valueArg;
  const type = isPhraseArg.value ? 'phrase' : 'best_fields';

  if (fieldNameArg.value === null) {
    if (valueArg.type === 'wildcard') {
      return {
        query_string: {
          query: wildcard.toQueryStringQuery(valueArg),
        },
      };
    }

    return {
      multi_match: {
        type,
        query: value,
        lenient: true,
      }
    };
  }

  const fields = getFields(fieldNameArg, indexPattern);

  // If no fields are found in the index pattern we send through the given field name as-is. We do this to preserve
  // the behaviour of lucene on dashboards where there are panels based on different index patterns that have different
  // fields. If a user queries on a field that exists in one pattern but not the other, the index pattern without the
  // field should return no results. It's debatable whether this is desirable, but it's been that way forever, so we'll
  // keep things familiar for now.
  if (fields && fields.length === 0) {
    fields.push({
      name: ast.toElasticsearchQuery(fieldNameArg),
      scripted: false,
    });
  }

  const isExistsQuery = valueArg.type === 'wildcard' && value === '*';
  const isMatchAllQuery = isExistsQuery && fields && fields.length === indexPattern.fields.length;

  if (isMatchAllQuery) {
    return { match_all: {} };
  }

  const queries = fields.reduce((accumulator, field) => {
    if (field.scripted) {
      // Exists queries don't make sense for scripted fields
      if (!isExistsQuery) {
        return [...accumulator, {
          script: {
            ...getPhraseScript(field, value)
          }
        }];
      }
    }
    else if (isExistsQuery) {
      return [...accumulator, {
        exists: {
          field: field.name
        }
      }];
    }
    else if (valueArg.type === 'wildcard') {
      return [...accumulator, {
        query_string: {
          fields: [field.name],
          query: wildcard.toQueryStringQuery(valueArg),
        }
      }];
    }
    else {
      const queryType = type === 'phrase' ? 'match_phrase' : 'match';
      return [...accumulator, {
        [queryType]: {
          [field.name]: value
        }
      }];
    }
  }, []);

  return {
    bool: {
      should: queries,
      minimum_should_match: 1
    }
  };
}

