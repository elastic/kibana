import _ from 'lodash';

export function getDefaultQuery() {
  return { match_all: {} };
}

export function isDefaultQuery(query) {
  return _.isEqual(query, getDefaultQuery());
}

export function getTextQuery(query) {
  return {
    query_string: { query }
  };
}

export function isTextQuery(query) {
  return _.has(query, ['query_string', 'query']);
}

export function getQueryText(query) {
  return _.get(query, ['query_string', 'query']);
}
