/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const unquoteString = str => {
  if (/^"/.test(str)) {
    return str.replace(/^"(.+(?="$))"$/, '$1');
  }
  if (/^'/.test(str)) {
    return str.replace(/^'(.+(?='$))'$/, '$1');
  }
  return str;
};
