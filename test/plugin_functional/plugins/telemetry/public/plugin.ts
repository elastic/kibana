/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from '@kbn/core/public';
import type { TelemetryPluginSetup } from '@kbn/telemetry-plugin/public';

interface TelemetryTestPluginSetupDependencies {
  telemetry: TelemetryPluginSetup;
}

export class TelemetryTestPlugin implements Plugin {
  setup(core: CoreSetup, { telemetry }: TelemetryTestPluginSetupDependencies) {
    window._checkCanSendTelemetry = async () => {
      await telemetry.telemetryService.setOptIn(true);
      return telemetry.telemetryService.canSendTelemetry();
    };

    window._resetTelemetry = async () => {
      await telemetry.telemetryService.setOptIn(false);
    };
  }
  start() {}
}
