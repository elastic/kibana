import _ from 'lodash';
import angular from 'angular';

/**
 * Take text from the model and present it to the user as a string
 * @param {text} model value
 * @returns {string}
 */
export default function toUser(text) {
  if (text == null) return '';
  if (_.isObject(text)) {
    if (text.query_string) return toUser(text.query_string.query);
    if (text.match_all && !_.has(text.match_all, 'boost')) return '';
    return angular.toJson(text);
  }
  return '' + text;
}
