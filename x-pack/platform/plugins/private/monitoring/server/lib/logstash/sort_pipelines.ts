/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import type { Pipeline, PipelineMetricKey } from '../../types';

export function sortPipelines(
  pipelines: Pipeline[],
  sort: { field: PipelineMetricKey | ''; direction: 'asc' | 'desc' }
): Pipeline[] {
  if (!sort) {
    return pipelines;
  }

  return orderBy(pipelines, [sort.field], [sort.direction]);
}
