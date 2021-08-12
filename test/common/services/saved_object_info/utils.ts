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
  if (flags.esUrl === '') throw createFlagError('please provide a single --esUrl flag.');
  // TODO: Why isnt this flag throwing???
  if (flags.type && flags.type.length === 0) throw createFlagError('please provide a comma-separated list of types.');

  return true;
};

// TODO: xs.length is stringified so its returning a much larger number for length
export const print = (log: ToolingLog) => (msg: string | null = null) => (xs: any) =>
  log.success(`\n### Saved Object Types ${msg || 'Count: ' + xs.length}\n${xs}`);

export const expectedFlags = () => ({
  string: ['esUrl', 'type'],
  boolean: ['soTypes', 'detectionRules'],
  help: `
--esUrl             Required, tells the app which url to point to
--soTypes           Not required, tells the svc to show the types within the .kibana index
--detectionRules    Not required, tells the svc to show the detection rules.
--type              Not required, tells the svc to only show specific types of types, specified via a comma-separated list.
        `,
});
