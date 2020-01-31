/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

/* eslint-disable-next-line import/no-extraneous-dependencies */
import madge from 'madge';
/* eslint-disable-next-line import/no-extraneous-dependencies */
import { run, createFailError } from '@kbn/dev-utils';

run(
  async ({ log }) => {
    const result = await madge(
      [resolve(__dirname, '../../public'), resolve(__dirname, '../../common')],
      {
        fileExtensions: ['ts', 'js', 'tsx'],
      }
    );

    const circularFound = result.circular();
    // We can only care about SIEM code, we should not be penalyze for others
    if (circularFound.filter(cf => cf.includes('siem')).length !== 0) {
      throw createFailError(
        'SIEM circular dependencies of imports has been found:' +
          '\n - ' +
          circularFound.join('\n - ')
      );
    } else {
      log.success('No circular deps 👍');
    }
  },
  {
    description: 'Check the SIEM plugin for circular deps',
  }
);
