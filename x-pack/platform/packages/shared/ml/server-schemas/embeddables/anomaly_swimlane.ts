/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';

const baseProps = {
  ...serializedTitlesSchema.getPropSchemas(),
  ...serializedTimeRangeSchema.getPropSchemas(),
  job_ids: schema.arrayOf(schema.string({ minLength: 1, maxLength: 1000 }), {
    minSize: 1,
    maxSize: 10000,
    meta: {
      description:
        'IDs of the anomaly detection jobs or groups whose results are shown in the swim lane.',
    },
  }),
  per_page: schema.maybe(
    schema.number({
      min: 1,
      meta: {
        description:
          'Number of rows to display per page in a view-by swim lane. Ignored for overall swim lanes.',
      },
    })
  ),
};

const anomalySwimLaneOverallSchema = schema.object({
  ...baseProps,
  swimlane_type: schema.literal('overall'),
});

const anomalySwimLaneViewBySchema = schema.object({
  ...baseProps,
  swimlane_type: schema.literal('viewBy'),
  view_by: schema.string({
    minLength: 1,
    maxLength: 1000,
    meta: { description: 'Field name used to split anomalies into a view-by swim lane.' },
  }),
});

export const anomalySwimLaneEmbeddableStateSchema = schema.oneOf(
  [anomalySwimLaneOverallSchema, anomalySwimLaneViewBySchema],
  {
    meta: {
      id: 'ml_anomaly_swimlane',
      description: 'Anomaly Swim Lane embeddable',
    },
  }
);

export type AnomalySwimLaneEmbeddableState = TypeOf<typeof anomalySwimLaneEmbeddableStateSchema>;

export type SwimlaneType = AnomalySwimLaneEmbeddableState['swimlane_type'];
