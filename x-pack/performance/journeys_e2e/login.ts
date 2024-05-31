/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

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
}).step('Login', async ({ page, kbnUrl, inputDelays, auth }) => {
  await page.goto(kbnUrl.get());
  if (auth.isCloud()) {
    await page.click(subj('loginCard-basic/cloud-basic'), { delay: inputDelays.MOUSE_CLICK });
  }

  await page.type(subj('loginUsername'), auth.getUsername(), { delay: inputDelays.TYPING });
  await page.type(subj('loginPassword'), auth.getPassword(), { delay: inputDelays.TYPING });
  await page.click(subj('loginSubmit'), { delay: inputDelays.MOUSE_CLICK });
  await page.waitForSelector(subj('userMenuButton'), {
    state: 'attached',
  });
});
