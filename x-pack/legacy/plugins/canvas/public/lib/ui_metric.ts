/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

export const METRIC_TYPE = npStart.plugins.metrics.METRIC_TYPE;
export const trackCanvasUiMetric = npStart.plugins.metrics.reportUiStats.bind(null, 'canvas');
