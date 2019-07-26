/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { uiModules } from 'ui/modules';
// @ts-ignore
import { Path } from 'plugins/xpack_main/services/path';
// @ts-ignore
import { npStart } from 'ui/new_platform';
// @ts-ignore
import { Telemetry } from './telemetry';
// @ts-ignore
import { fetchTelemetry } from './fetch_telemetry';

function telemetryInit($injector: any) {
  const $http = $injector.get('$http');

  const telemetryEnabled = npStart.core.injectedMetadata.getInjectedVar('telemetryEnabled');

  if (telemetryEnabled) {
    // no telemetry for non-logged in users
    if (Path.isUnauthenticated()) {
      return;
    }

    const sender = new Telemetry($injector, () => fetchTelemetry($http));
    sender.start();
  }
}

uiModules.get('telemetry/hacks').run(telemetryInit);
