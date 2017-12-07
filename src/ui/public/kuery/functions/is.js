import _ from 'lodash';
import * as literal from '../node_types/literal';
import { getPhraseScript } from 'ui/filter_manager/lib/phrase';

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
  const { arguments: [ fieldNameArg, valueArg ] } = node;
  const fieldName = literal.toElasticsearchQuery(fieldNameArg);
  const field = indexPattern.fields.byName[fieldName];
  const value = !_.isUndefined(valueArg) ? literal.toElasticsearchQuery(valueArg) : valueArg;

  if (field && field.scripted) {
    return {
      script: {
        ...getPhraseScript(field, value)
      }
    };
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
  else if (fieldName === '*' && value === '*') {
    return { match_all: {} };
  }
  else if (fieldName === '*' && value !== '*') {
    return {
      multi_match: {
        query: value,
        fields: ['*'],
        type: 'phrase',
        lenient: true,
      }
    };
  }
  else if (fieldName !== '*' && value === '*') {
    return {
      exists: { field: fieldName }
    };
  }
  else {
    return {
      match_phrase: {
        [fieldName]: value
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
