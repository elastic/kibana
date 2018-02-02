import _ from 'lodash';
import * as literal from '../node_types/literal';
import { getPhraseScript } from 'ui/filter_manager/lib/phrase';
import { getFieldsByWildcard } from './utils/get_fields_by_wildcard';

export function buildNodeParams(fieldName, value, serializeStyle = 'operator') {
  if (_.isUndefined(fieldName)) {
    throw new Error('fieldName is a required argument');
  }
  if (_.isUndefined(value)) {
    throw new Error('value is a required argument');
  }

  return {
    arguments: [literal.buildNode(fieldName), literal.buildNode(value)],
    serializeStyle
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const { arguments: [fieldNameArg, valueArg] } = node;
  const fieldName = literal.toElasticsearchQuery(fieldNameArg);
  const fields = getFieldsByWildcard(fieldName, indexPattern);
  const scriptedFields = fields.filter(field => field.scripted);
  const nonScriptedFields = fields.filter(field => !field.scripted);
  const value = !_.isUndefined(valueArg) ? literal.toElasticsearchQuery(valueArg) : valueArg;

  if (fieldName === '*' && value === '*') {
    return { match_all: {} };
  }
  else if (fieldName === null) {
    return {
      multi_match: {
        query: value,
        type: 'phrase',
        lenient: true,
      }
    };
  }

  const queries = scriptedFields.map((scriptedField) => {
    return {
      script: {
        ...getPhraseScript(scriptedField, value)
      }
    };
  });

  if (!_.isEmpty(nonScriptedFields)) {
    nonScriptedFields.forEach((field) => {
      queries.push({
        match_phrase: {
          [field.name]: value
        }
      });
    });
  }

  if (queries.length === 1) {
    return queries[0];
  }
  else {
    return {
      bool: {
        should: queries,
        minimum_should_match: 1,
      }
    };
  }
}

export function toKueryExpression(node) {
  if (node.serializeStyle !== 'operator') {
    throw new Error(`Cannot serialize "is" function as "${node.serializeStyle}"`);
  }

  const { arguments: [ fieldNameArg, valueArg ] } = node;
  const fieldName = literal.toKueryExpression(fieldNameArg);
  const value = !_.isUndefined(valueArg) ? literal.toKueryExpression(valueArg) : valueArg;

  return `${fieldName}:${value}`;
}
