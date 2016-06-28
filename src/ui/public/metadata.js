import $ from 'jquery';
import _ from 'lodash';

const state = $('kbn-initial-state').attr('data');
const kbn = window.__KBN__ = JSON.parse(state);

export default deepFreeze(kbn);

function deepFreeze(object) {
  // for any properties that reference an object, makes sure that object is
  // recursively frozen as well
  Object.keys(object).forEach(key => {
    const value = object[key];
    if (_.isObject(value)) {
      deepFreeze(value);
    }
  });

  return Object.freeze(object);
}
