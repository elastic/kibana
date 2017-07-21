import _ from 'lodash';
import angular from 'angular';

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
  return _.has(query, 'query_string');
}

export function getQueryText(query) {
  return _.get(query, ['query_string', 'query']) || '';
}

export function parseQuery(query) {
  if (!_.isString(query) || query.trim() === '') {
    return getDefaultQuery();
  }

  try {
    const parsedQuery = JSON.parse(query);
    if (_.isObject(parsedQuery)) {
      return parsedQuery;
    }
    return getTextQuery(query);
  } catch (e) {
    return getTextQuery(query);
  }
}

export function formatQuery(query) {
  if (query == null || isDefaultQuery(query)) {
    return '';
  } else if (isTextQuery(query)) {
    return getQueryText(query);
  } else if (_.isObject(query)) {
    return angular.toJson(query);
  }
  return '' + query;
}
