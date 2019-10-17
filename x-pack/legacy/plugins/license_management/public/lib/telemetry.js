/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchTelemetry } from '../../../../../../src/legacy/core_plugins/telemetry/public/hacks/fetch_telemetry';
export { PRIVACY_STATEMENT_URL } from '../../../../../../src/legacy/core_plugins/telemetry/common/constants';
export { TelemetryOptInProvider } from '../../../../../../src/legacy/core_plugins/telemetry/public/services';
export { OptInExampleFlyout } from '../../../../../../src/legacy/core_plugins/telemetry/public/components';

export { PRIVACY_STATEMENT_URL } from '../../../../../../src/legacy/core_plugins/telemetry/common/constants';
export { OptInExampleFlyout } from '../../../../../../src/legacy/core_plugins/telemetry/public/components';

export { getTelemetryOptInService };
export const shouldShowTelemetryOptIn = () => {
  return telemetryEnabled && !getTelemetryOptInService().getOptIn();
};
