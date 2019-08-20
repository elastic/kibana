/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';

// This overrides settings for other UI tests
uiModules.get('kibana')
  // disable stat reporting while running tests,
  // MockInjector used in these tests is not impacted
  .constant('telemetryEnabled', false)
  .constant('telemetryOptedIn', null)
  .constant('telemetryUrl', 'not.a.valid.url.0');
