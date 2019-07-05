/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricLayoutSectionType } from '../../../pages/metrics/layouts/types';
import { ChartSection } from './chart_section';
import { GaugesSection } from './gauges_section';

export const sections = {
  [InfraMetricLayoutSectionType.chart]: ChartSection,
  [InfraMetricLayoutSectionType.gauges]: GaugesSection,
};
