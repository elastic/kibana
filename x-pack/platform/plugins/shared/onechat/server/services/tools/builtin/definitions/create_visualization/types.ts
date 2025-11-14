/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricStateESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/metric';
import type { MapAttributes } from '@kbn/maps-plugin/server/content_management/schema/v1/map_attributes_schema/types';

export type VisualizationConfig = MetricStateESQL;
export type MapConfig = MapAttributes;

export type CombinedVisualizationConfig = VisualizationConfig | MapConfig;
