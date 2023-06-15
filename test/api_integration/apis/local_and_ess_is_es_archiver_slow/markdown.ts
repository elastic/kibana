/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint no-console: ["error",{ allow: ["log"] }] */

import { FinalResult } from './shared.types';
import type { MarkdownMetricsTriplet, OneDecimalStr, RuntimeEnv } from './shared.types';

const triplet =
  (avg: OneDecimalStr) =>
  (min: OneDecimalStr) =>
  (max: OneDecimalStr): MarkdownMetricsTriplet =>
    `${avg} / ${min} / ${max}`;

export const template = (environment: RuntimeEnv) => (fr: FinalResult) => {
  const { name, avg, min, max } = fr;
  const mdRow = `| ${environment} avg / min / max | ${triplet(avg)(min)(max)} | Cell |`;

  return `
${name}
${mdRow}
`;
};
export const markdownify = (environment: RuntimeEnv) => (fr: FinalResult) =>
  template(environment)(fr);
