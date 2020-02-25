/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TelemetryPluginSetup } from '../../../../../../../../src/plugins/telemetry/public';

export { OptInExampleFlyout } from '../../../../../../../../src/plugins/telemetry/public/components';
export { PRIVACY_STATEMENT_URL } from '../../../../../../../../src/plugins/telemetry/common/constants';
export { TelemetryPluginSetup, shouldShowTelemetryOptIn };

function shouldShowTelemetryOptIn(
  telemetry?: TelemetryPluginSetup
): telemetry is TelemetryPluginSetup {
  if (telemetry) {
    const { telemetryService } = telemetry;
    const isOptedIn = telemetryService.getIsOptedIn();
    const canChangeOptInStatus = telemetryService.getCanChangeOptInStatus();
    return canChangeOptInStatus && !isOptedIn;
  }

  return false;
}
