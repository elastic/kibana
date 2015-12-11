const buildQueryString = require('./build_query_string');
const { parse } = require('querystring');

export default function removeAppState(url, key) {
  let index = url.indexOf('?');
  if (index === -1) return url;

  let base = url.substring(0, index);
  let qs = url.substring(index + 1);

  let qsParts = parse(qs);
  delete qsParts[key];
  qs = buildQueryString(qsParts);

  return `${base}?${qs}`;
}
