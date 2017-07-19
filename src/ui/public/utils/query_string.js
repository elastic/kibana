import { encodeQueryComponent } from '../../../utils';

export const QueryString = {};

/*****
/*** orignally copied from angular, modified our purposes
/*****/

function tryDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  }
  // Ignore any invalid uri component
  catch (e) {} // eslint-disable-line no-empty
}

/**
 * Parses an escaped url query string into key-value pairs.
 * @returns {Object.<string,boolean|Array>}
 */
QueryString.decode = function (keyValue) {
  const obj = {};
  let keyValueParts;
  let key;

  (keyValue || '').split('&').forEach(function (keyValue) {
    if (keyValue) {
      keyValueParts = keyValue.split('=');
      key = tryDecodeURIComponent(keyValueParts[0]);
      if (key !== void 0) {
        const val = keyValueParts[1] !== void 0 ? tryDecodeURIComponent(keyValueParts[1]) : true;
        if (!obj[key]) {
          obj[key] = val;
        } else if (Array.isArray(obj[key])) {
          obj[key].push(val);
        } else {
          obj[key] = [obj[key], val];
        }
      }
    }
  });
  return obj;
};

/**
 * Creates a queryString out of an object
 * @param  {Object} obj
 * @return {String}
 */
QueryString.encode = function (obj) {
  const parts = [];
  const keys = Object.keys(obj).sort();
  keys.forEach(function (key) {
    const value = obj[key];
    if (Array.isArray(value)) {
      value.forEach(function (arrayValue) {
        parts.push(QueryString.param(key, arrayValue));
      });
    } else {
      parts.push(QueryString.param(key, value));
    }
  });
  return parts.length ? parts.join('&') : '';
};

QueryString.param = function (key, val) {
  return encodeQueryComponent(key, true) + (val === true ? '' : '=' + encodeQueryComponent(val, true));
};

/**
 * Extracts the query string from a url
 * @param  {String} url
 * @return {Object} - returns an object describing the start/end index of the url in the string. The indices will be
 *                    the same if the url does not have a query string
 */
QueryString.findInUrl = function (url) {
  let qsStart = url.indexOf('?');
  let hashStart = url.lastIndexOf('#');

  if (hashStart === -1) {
    // out of bounds
    hashStart = url.length;
  }

  if (qsStart === -1) {
    qsStart = hashStart;
  }

  return {
    start: qsStart,
    end: hashStart
  };
};

QueryString.replaceParamInUrl = function (url, param, newVal) {
  const loc = QueryString.findInUrl(url);
  const parsed = QueryString.decode(url.substring(loc.start + 1, loc.end));

  if (newVal != null) {
    parsed[param] = newVal;
  } else {
    delete parsed[param];
  }

  const chars = url.split('');
  chars.splice(loc.start, loc.end - loc.start, '?' + QueryString.encode(parsed));
  return chars.join('');
};
