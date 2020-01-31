/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { canStartTrial, startTrial } from '../../../lib/start_trial';

export function registerStartTrialRoutes(router, xpackInfo) {
  router.get('/start_trial', request => {
    return canStartTrial(request);
  });
  router.post('/start_trial', request => {
    return startTrial(request, xpackInfo);
  });
}
