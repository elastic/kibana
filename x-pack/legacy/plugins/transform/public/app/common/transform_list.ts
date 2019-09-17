/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataFrameTransformId, DataFrameTransformPivotConfig } from './transform';
import { DataFrameTransformStats } from './transform_stats';

// Used to pass on attribute names to table columns
export enum DATA_FRAME_TRANSFORM_LIST_COLUMN {
  CONFIG_DEST_INDEX = 'config.dest.index',
  CONFIG_SOURCE_INDEX = 'config.source.index',
  DESCRIPTION = 'config.description',
  ID = 'id',
}

export interface DataFrameTransformListRow {
  id: DataFrameTransformId;
  config: DataFrameTransformPivotConfig;
  mode?: string; // added property on client side to allow filtering by this field
  stats: DataFrameTransformStats;
}
