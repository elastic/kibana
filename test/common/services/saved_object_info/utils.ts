/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';
import { createFlagError } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';

interface ResolvedPayload {
  xs: any;
  count: number;
}

export const format = (obj: any): ResolvedPayload => {
  return {
    xs: inspect(obj, {
      compact: false,
      depth: 99,
      breakLength: 80,
      sorted: true,
    }),
    count: obj.length,
  };
};

export const noop = () => {};

export const areValid = (flags: any) => {
  if (flags.esUrl === '') throw createFlagError('please provide a single --esUrl flag');
  return true;
};

export const print =
  (log: ToolingLog) =>
  (msg: string | null = null) =>
  ({ xs, count }: ResolvedPayload) =>
    log.write(`\n### Saved Object Types ${msg || 'Count: ' + count}\n${xs}`);

export const expectedFlags = () => ({
  string: ['esUrl'],
  boolean: ['soTypes', 'json'],
  help: `
--esUrl             Required, tells the svc which url to point to
--soTypes           Not Required, tells the svc to show the types within the .kibana index
--json              Not Required, tells the svc to show the types, with only json output.  Useful for piping into jq
        `,
});

export const payload = ({ xs, count }: ResolvedPayload) => ({
  xs,
  count,
});
