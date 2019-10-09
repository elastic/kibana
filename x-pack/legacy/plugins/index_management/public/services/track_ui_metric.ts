/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart, npSetup } from 'ui/new_platform';
import { UIM_APP_NAME } from '../../common/constants';

npSetup.plugins.metrics.registerApp(UIM_APP_NAME);
export const METRIC_TYPE = npStart.plugins.metrics.METRIC_TYPE;
export const trackUiMetric = npStart.plugins.metrics.reportUiStats.bind(null, UIM_APP_NAME);
