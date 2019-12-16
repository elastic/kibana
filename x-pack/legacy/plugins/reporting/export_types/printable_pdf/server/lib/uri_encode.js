/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { forEach, isArray } from 'lodash';
import { encodeUriQuery } from './encode_uri_query';

function toKeyValue(obj) {
  const parts = [];
  forEach(obj, function(value, key) {
    if (isArray(value)) {
      forEach(value, function(arrayValue) {
        const keyStr = encodeUriQuery(key, true);
        const valStr = arrayValue === true ? '' : '=' + encodeUriQuery(arrayValue, true);
        parts.push(keyStr + valStr);
      });
    } else {
      const keyStr = encodeUriQuery(key, true);
      const valStr = value === true ? '' : '=' + encodeUriQuery(value, true);
      parts.push(keyStr + valStr);
    }
  });
  return parts.length ? parts.join('&') : '';
}

export const uriEncode = {
  stringify: toKeyValue,
  string: encodeUriQuery,
};
