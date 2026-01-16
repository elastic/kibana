/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IndexName, TransformId } from '../../../../common';

export function generateDestIndex(transformId: TransformId): IndexName {
  return `user-${transformId}`;
}

export function generateTransformConfig(
  transformId: TransformId,
  continuous = false
): Omit<estypes.TransformPutTransformRequest, 'transform_id'> {
  const destinationIndex = generateDestIndex(transformId);

  return {
    source: { index: ['ft_farequote'] },
    pivot: {
      group_by: { airline: { terms: { field: 'airline' } } },
      aggregations: { '@timestamp.value_count': { value_count: { field: '@timestamp' } } },
    },
    dest: { index: destinationIndex },
    ...(continuous ? { sync: { time: { field: '@timestamp', delay: '60s' } } } : {}),
  };
}
