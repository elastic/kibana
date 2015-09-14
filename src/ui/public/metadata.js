// singleton for immutable copy of window.__KBN__
define(function (require) {
  const _ = require('lodash');

  if (!_.has(window, '__KBN__')) {
    throw new Error('window.__KBN__ must be set for metadata');
  }

  const kbn = _.cloneDeep(window.__KBN__ || {});
  return deepFreeze(kbn);

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
});
