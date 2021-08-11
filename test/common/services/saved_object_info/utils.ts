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

export const logTypes = (log: ToolingLog) => (x: any) => log.info(`${x}\n`);

export const expectedFlags = () => ({
  string: ['esUrl'],
  boolean: ['soTypes', 'detectionRules'],
  help: `
--esUrl             Required, tells the app which url to point to
--soTypes           Not Required, tells the svc to show the types within the .kibana index
--detectionRules    Not required, tells the svc to show the detection rules.
        `,
});
