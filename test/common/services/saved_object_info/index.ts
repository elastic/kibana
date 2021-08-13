/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-utils';
import { pipe } from 'fp-ts/function';
import { payload, noop, areValid, print, expectedFlags } from './utils';
import { types } from './saved_object_info';

export { SavedObjectInfoService } from './saved_object_info';

export const runSavedObjInfoSvc = () =>
  run(
    async ({ flags, log }) => {
      const printWith = print(log);

      const getAndFormatAndPrint = async () =>
        pipe(await types(flags.esUrl as string)(), payload, printWith());

      return areValid(flags) ? getAndFormatAndPrint() : noop();
    },
    {
      description: `

Show information pertaining to the saved objects in the .kibana index

Examples:

See 'saved_objects_info_svc.md'

      `,
      flags: expectedFlags(),
    }
  );
