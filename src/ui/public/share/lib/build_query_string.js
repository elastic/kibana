const _ = require('lodash');

export default function buildQueryString(data) {
  var result = [];
  _.forOwn(data, (value, key) => {
    result.push(`${key}=${value}`);
  });
  return result.join('&');
}
