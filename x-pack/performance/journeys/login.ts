/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { waitForChrome } from '../utils';

export const journey = new Journey({
  skipAutoLogin: true,
  scalabilitySetup: {
    warmup: [
      {
        action: 'constantConcurrentUsers',
        userCount: 10,
        duration: '30s',
      },
      {
        action: 'rampConcurrentUsers',
        minUsersCount: 10,
        maxUsersCount: 50,
        duration: '2m',
      },
    ],
    test: [
      {
        action: 'constantConcurrentUsers',
        userCount: 50,
        duration: '5m',
      },
    ],
    maxDuration: '10m',
  },
}).step('Login', async ({ page, kbnUrl, inputDelays }) => {
  await page.goto(kbnUrl.get());

  await page.type(subj('loginUsername'), 'elastic', { delay: inputDelays.TYPING });
  await page.type(subj('loginPassword'), 'changeme', { delay: inputDelays.TYPING });
  await page.click(subj('loginSubmit'), { delay: inputDelays.MOUSE_CLICK });

  await waitForChrome(page);
});
