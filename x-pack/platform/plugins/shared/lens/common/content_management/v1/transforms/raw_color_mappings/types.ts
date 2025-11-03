/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeprecatedColorMappingsXYState } from './xy';
import type { DeprecatedColorMappingLensPartitionVisualizationState } from './partition';
import type { DeprecatedColorMappingsDatatableState } from './datatable';
import type { DeprecatedColorMappingTagcloudState } from './tagcloud';

export type DeprecatedColorMappingsState =
  | DeprecatedColorMappingsXYState
  | DeprecatedColorMappingLensPartitionVisualizationState
  | DeprecatedColorMappingsDatatableState
  | DeprecatedColorMappingTagcloudState;
