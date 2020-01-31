/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';

uiModules
  .get('kibana')
  // disable stat reporting while running tests,
  // MockInjector used in these tests is not impacted
  .constant('reportingPollConfig', {
    jobCompletionNotifier: {
      interval: 0,
      intervalErrorMultiplier: 0,
    },
    jobsRefresh: {
      interval: 0,
      intervalErrorMultiplier: 0,
    },
  });
