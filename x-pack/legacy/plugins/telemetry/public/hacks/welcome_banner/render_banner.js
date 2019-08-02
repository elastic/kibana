/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { banners } from 'ui/notify';

import { clickBanner } from './click_banner';
import { OptInBanner } from './opt_in_banner_component';

/**
 * Render the Telemetry Opt-in banner.
 *
 * @param {Object} telemetryOptInProvider The telemetry opt-in provider.
 * @param {Function} fetchTelemetry Function to pull telemetry on demand.
 * @param {Object} _banners Banners singleton, which can be overridden for tests.
 */
export function renderBanner(telemetryOptInProvider, fetchTelemetry, { _banners = banners } = {}) {
  const bannerId = _banners.add({
    component: (
      <OptInBanner
        optInClick={optIn => clickBanner(bannerId, telemetryOptInProvider, optIn)}
        fetchTelemetry={fetchTelemetry}
      />
    ),
    priority: 10000
  });
}
