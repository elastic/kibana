/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toPath from 'lodash.topath';

export function prepend(path, value) {
  return toPath(value).concat(toPath(path));
}

export function append(path, value) {
  return toPath(path).concat(toPath(value));
}

export function convert(path) {
  return toPath(path);
}
