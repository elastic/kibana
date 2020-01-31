/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// A simple template renderer, it replaces mustache/angular style {{...}} tags with
// the values provided via the data object
export function renderTemplate(str, data) {
  const matches = str.match(/{{(.*?)}}/g);

  if (Array.isArray(matches)) {
    matches.forEach(v => {
      str = str.replace(v, data[v.replace(/{{|}}/g, '')]);
    });
  }

  return str;
}

export function stringHash(str) {
  let hash = 0;
  let chr = '';
  if (str.length === 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash < 0 ? hash * -2 : hash;
}
