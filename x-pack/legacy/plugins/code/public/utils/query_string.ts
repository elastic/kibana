/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Copied from `ui/utils/query_string` because of NP migration.
 */

function encodeQueryComponent(val: string, pctEncodeSpaces = false) {
  return encodeURIComponent(val)
    .replace(/%40/gi, '@')
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, pctEncodeSpaces ? '%20' : '+');
}

function tryDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch (e) {} // eslint-disable-line no-empty
}

/**
 * Parses an escaped url query string into key-value pairs.
 * @returns {Object.<string,boolean|Array>}
 */
const decode = (keyValue: any) => {
  const obj: { [s: string]: any } = {};
  let keyValueParts;
  let key;

  (keyValue || '').split('&').forEach((keyVal: any) => {
    if (keyVal) {
      keyValueParts = keyVal.split('=');
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
const encode = (obj: any) => {
  const parts: any[] = [];
  const keys = Object.keys(obj).sort();
  keys.forEach((key: any) => {
    const value = obj[key];
    if (Array.isArray(value)) {
      value.forEach((arrayValue: any) => {
        parts.push(param(key, arrayValue));
      });
    } else {
      parts.push(param(key, value));
    }
  });
  return parts.length ? parts.join('&') : '';
};

const param = (key: string, val: any) => {
  return (
    encodeQueryComponent(key, true) + (val === true ? '' : '=' + encodeQueryComponent(val, true))
  );
};

/**
 * Extracts the query string from a url
 * @param  {String} url
 * @return {Object} - returns an object describing the start/end index of the url in the string. The indices will be
 *                    the same if the url does not have a query string
 */
const findInUrl = (url: string) => {
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
    end: hashStart,
  };
};

export const replaceParamInUrl = (url: string, p: string, newVal: any) => {
  const loc = findInUrl(url);
  const parsed = decode(url.substring(loc.start + 1, loc.end));

  if (newVal != null) {
    parsed[p] = newVal;
  } else {
    delete parsed[p];
  }

  const chars = url.split('');
  chars.splice(loc.start, loc.end - loc.start, '?' + encode(parsed));
  return chars.join('');
};
