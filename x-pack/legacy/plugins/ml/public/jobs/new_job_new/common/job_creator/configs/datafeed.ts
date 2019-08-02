/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternTitle } from '../../../../../../common/types/kibana';
import { JobId } from './job';
export type DatafeedId = string;

export interface Datafeed {
  datafeed_id: DatafeedId;
  aggregations?: object;
  chunking_config?: ChunkingConfig;
  frequency?: string;
  indices: IndexPatternTitle[];
  job_id?: JobId;
  query: object;
  query_delay?: string;
  script_fields?: object;
  scroll_size?: number;
  delayed_data_check_config?: object;
}

export interface ChunkingConfig {
  mode: 'auto' | 'manual' | 'off';
  time_span?: string;
}
