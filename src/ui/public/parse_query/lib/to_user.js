import _ from 'lodash';
import angular from 'angular';
import { isDefaultQuery } from './query_utils';

/**
 * Take query from the model and present it to the user as a string
 * @param {query} model value
 * @returns {string}
 */
export function toUser(query) {
  if (query == null || isDefaultQuery(query)) {
    return '';
  } else if (_.has(query, 'query_string')) {
    return query.query_string.query;
  } else if (_.isObject(query)) {
    return angular.toJson(query);
  }
  return '' + query;
}
