/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PARTITION_CHART_TYPES, type PartitionChartType } from '@kbn/visualizations-plugin/common';

const PartitionChartTypesList = Object.values<string>(PARTITION_CHART_TYPES);

export const isPartitionShape = (shape: string): shape is PartitionChartType =>
  PartitionChartTypesList.includes(shape);
