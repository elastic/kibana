/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { Path } from 'plugins/xpack_main/services/path';
import { fetchTelemetry } from '../fetch_telemetry';
import { renderBanner } from './render_banner';
import { shouldShowBanner } from './should_show_banner';
import { TelemetryOptInProvider } from '../../services/telemetry_opt_in';
import { npStart } from 'ui/new_platform';

/**
 * Add the Telemetry opt-in banner if the user has not already made a decision.
 *
 * Note: this is an async function, but Angular fails to use it as one. Its usage does not need to be awaited,
 * and thus it can be wrapped in the run method to just be a normal, non-async function.
 *
 * @param {Object} $injector The Angular injector
 */
async function asyncInjectBanner($injector) {
  const Private = $injector.get('Private');
  const telemetryOptInProvider = Private(TelemetryOptInProvider);
  const config = $injector.get('config');

  // and no banner for non-logged in users
  if (Path.isUnauthenticated()) {
    return;
  }

  // and no banner on status page
  if (chrome.getApp().id === 'status_page') {
    return;
  }

  // determine if the banner should be displayed
  if (await shouldShowBanner(telemetryOptInProvider, config)) {
    const $http = $injector.get('$http');

    renderBanner(telemetryOptInProvider, () => fetchTelemetry($http, { unencrypted: true }));
  }
}

/**
 * Add the Telemetry opt-in banner when appropriate.
 *
 * @param {Object} $injector The Angular injector
 */
export function injectBanner($injector) {
  const telemetryEnabled = npStart.core.injectedMetadata.getInjectedVar('telemetryEnabled');
  const telemetryBanner = npStart.core.injectedMetadata.getInjectedVar('telemetryBanner');
  if (telemetryEnabled && telemetryBanner) {
    asyncInjectBanner($injector);
  }
}
