/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricStateESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/metric';
import type { GaugeStateESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/gauge';
import type { TagcloudStateESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/tagcloud';

export type VisualizationConfig = MetricStateESQL | GaugeStateESQL | TagcloudStateESQL;
