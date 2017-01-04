import _ from 'lodash';

export default function keysDeep(object, base) {
  let result = [];
  let delimitedBase = base ? base + '.' : '';

  _.forEach(object, (value, key) => {
    var fullKey = delimitedBase + key;
    if (_.isPlainObject(value)) {
      result = result.concat(keysDeep(value, fullKey));
    } else {
      result.push(fullKey);
    }
  });

  if (base) {
    result.push(base);
  }

  return result;
};
