/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { APP_USAGE_TYPE } from '../../common/constants';

npSetup.plugins.metrics.registerApp(APP_USAGE_TYPE);
export const METRIC_TYPE = npStart.plugins.metrics.METRIC_TYPE;
export const trackUiAction = npStart.plugins.metrics.reportUiStats.bind(null, APP_USAGE_TYPE);
