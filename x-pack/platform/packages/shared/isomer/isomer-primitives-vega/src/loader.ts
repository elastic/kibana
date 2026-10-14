/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Loader } from 'vega';

const refuse = (what: string) => () => Promise.reject(new Error(`vega: refused to ${what}`));

/**
 * A Vega loader that fetches nothing. `sanitize` resolves to no URL rather
 * than rejecting, because Vega's SVG string renderer reads a link's sanitize
 * result without a null check.
 */
export const inertLoader: Loader = {
  load: refuse('load a URL'),
  sanitize: () => Promise.resolve({ href: '' }),
  http: refuse('fetch a URL'),
  file: refuse('read a file'),
};
