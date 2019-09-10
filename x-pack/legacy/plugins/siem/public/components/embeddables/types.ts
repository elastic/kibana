/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter as ESFilterType } from '@kbn/es-query';
import { TimeRange } from 'ui/timefilter';
import { EmbeddableInput } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';

export interface MapEmbeddableInput extends EmbeddableInput {
  filters: ESFilterType[];
  query: {
    query: string;
    language: string;
  };
  refreshConfig: {
    isPaused: boolean;
    interval: number;
  };
  timeRange?: TimeRange;
}

export interface IndexPatternMapping {
  title: string;
  id: string;
}
