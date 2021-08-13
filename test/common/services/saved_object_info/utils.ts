/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';
import { createFlagError, ToolingLog } from '@kbn/dev-utils';

export const format = (obj: unknown) =>
  inspect(obj, {
    compact: false,
    depth: 99,
    breakLength: 80,
    sorted: true,
  });

export const noop = () => {};

export const areValid = (flags: any) => {
  if (flags.esUrl === '') throw createFlagError('please provide a single --esUrl flag');
  return true;
};

// @ts-ignore
export const print = (log: ToolingLog) => (msg: string | null = null) => ({ xs, count }) =>
  log.success(`\n### Saved Object Types ${msg || 'Count: ' + count}\n${xs}`);

export const expectedFlags = () => ({
  string: ['esUrl'],
  boolean: ['soTypes'],
  help: `
--esUrl             Required, tells the app which url to point to
--soTypes           Not Required, tells the svc to show the types within the .kibana index
        `,
});

export const payload = (xs: any) => ({
  xs: format(xs),
  count: xs.length,
});
