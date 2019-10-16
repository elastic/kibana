/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTelemetryOptInService } from '../../../../../../src/legacy/core_plugins/telemetry/public/services';

export { PRIVACY_STATEMENT_URL } from '../../../../../../src/legacy/core_plugins/telemetry/common/constants';
export { OptInExampleFlyout } from '../../../../../../src/legacy/core_plugins/telemetry/public/components';

export { getTelemetryOptInService };
export const shouldShowTelemetryOptIn = () => {
  return telemetryEnabled && !getTelemetryOptInService().getOptIn();
};

// /Users/bamieh/Bamieh/kibana/src/legacy/core_plugins/telemetry/public/hacks/telemetry.js
// 24:10  error  'getTelemetryOptInService' is defined but never used  no-unused-vars

// /Users/bamieh/Bamieh/kibana/src/legacy/core_plugins/telemetry/public/services/telemetry_opt_in.test.js
// 106:13  error  'sinon' is not defined           no-undef
// 110:17  error  'sinon' is not defined           no-undef
// 127:12  error  'fetchTelemetry' is not defined  no-undef

// /Users/bamieh/Bamieh/kibana/x-pack/legacy/plugins/license_management/public/lib/telemetry.js
// 14:10  error  'telemetryEnabled' is not defined  no-undef
