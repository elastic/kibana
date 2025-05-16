/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toPath } from 'lodash';

export type Path = Array<string | number>;

export function prepend(path: string | Path, value: string | Path): Path {
  return toPath(value).concat(toPath(path));
}

export function append(path: string | Path, value: string | Path): Path {
  return toPath(path).concat(toPath(value));
}

export function convert(path: string | Path): Path {
  return toPath(path);
}
