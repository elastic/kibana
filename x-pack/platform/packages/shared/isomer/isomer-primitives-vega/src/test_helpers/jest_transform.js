/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { transformIgnorePatterns } = require('@kbn/jest/jest-preset');

const VEGA_ESM = [
  'vega',
  'vega-[^/\\\\]*',
  'd3-[^/\\\\]*',
  'delaunator',
  'internmap',
  'json-stringify-pretty-compact',
  'robust-predicates',
].join('|');

/** The preset's `transformIgnorePatterns`, also transforming the ESM-only Vega graph. */
module.exports = {
  transformIgnorePatterns: transformIgnorePatterns.map((pattern) =>
    pattern.replace('node_modules(?![\\/\\\\](', `node_modules(?![\\/\\\\](${VEGA_ESM}|`)
  ),
};
