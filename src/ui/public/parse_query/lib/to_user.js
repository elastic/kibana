import _ from 'lodash';
import angular from 'angular';

/**
 * Take text from the model and present it to the user as a string
 * @param {text} model value
 * @returns {string}
 */
export function toUser(text) {
  if (text == null || text === '*' || _.has(text, 'match_all')) {
    return '';
  } else if (_.isObject(text)) {
    if (text.query_string) return toUser(text.query_string.query);
    return angular.toJson(text);
  }
  return '' + text;
}
