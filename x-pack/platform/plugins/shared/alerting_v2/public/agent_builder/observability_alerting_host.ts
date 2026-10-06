/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityAlertingV2Host } from '@kbn/deeplinks-observability';
import { createAlertingV2HostApp, type AlertingV2HostApp } from '../locators';

/** Observability Alerting mount (`/app/observability/alerting`). */
export const OBSERVABILITY_ALERTING_HOST: AlertingV2HostApp =
  createObservabilityAlertingV2Host(createAlertingV2HostApp);
