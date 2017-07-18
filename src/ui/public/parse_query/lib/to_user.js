import _ from 'lodash';
import angular from 'angular';

/**
 * Take query from the model and present it to the user as a string
 * @param {query} model value
 * @returns {string}
 */
export function toUser(query) {
  if (query == null || query === '*' || _.has(query, 'match_all')) {
    return '';
  } else if (_.isObject(query)) {
    if (query.query_string) return toUser(query.query_string.query);
    return angular.toJson(query);
  }
  return '' + query;
}
