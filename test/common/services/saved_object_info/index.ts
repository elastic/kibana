/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run, createFlagError, ToolingLog } from '@kbn/dev-utils';
import { pipe } from 'fp-ts/function';
import { format, noop } from './utils';
import { types } from './saved_object_info';

export { SavedObjectInfoService } from './saved_object_info';

const expectedFlags = {
  string: ['esUrl'],
  boolean: ['soTypes', 'detectionRules'],
  help: `
--esUrl             Required, tells the app which url to point to
--soTypes           Not Required, tells the svc to show the types within the .kibana index
--detectionRules    Not required, tells the svc to show the detection rules.
        `,
};

const valid = (flags: any) => {
  if (flags.esUrl === '') throw createFlagError('please provide a single --esUrl flag');
  return true;
};

const logTypes = (log: ToolingLog) => (x: any) => log.info(`\n### types: \n\n${x}\n`);
export const runSavedObjInfoSvc = () =>
  run(
    async ({ flags, log }) =>
      valid(flags)
        ? await pipe(await types(flags.esUrl as string)(), format, logTypes(log))
        : noop(),
    {
      description: `

Show information pertaining to the saved objects in the .kibana index

Examples:

See 'saved_objects_info_svc.md'

      `,
      flags: expectedFlags,
    }
  );
