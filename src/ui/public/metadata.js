import $ from 'jquery';
import _ from 'lodash';

export const metadata = deepFreeze(getState());

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

function getState() {
  const stateKey = '__KBN__';
  if (!(stateKey in window)) {
    const state = $('kbn-initial-state').attr('data');
    window[stateKey] = JSON.parse(state);
  }
  return window[stateKey];
}
