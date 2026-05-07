/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import type { GetFieldsOf, MappingsDefinition, ToPrimitives } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import type { Overwrite } from 'utility-types';

export const DETECTIONS_DATA_STREAM = '.significant_events-detections';

export const detectionsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    detection_id: mappings.keyword(),
    superseded: mappings.boolean(),
    rule_uuid: mappings.keyword(),
    rule_name: mappings.keyword(),
    stream: mappings.keyword(),
  },
} satisfies MappingsDefinition;

export type StoredDetection = GetFieldsOf<typeof detectionsMappings>;

export type Detection = Overwrite<
  ToPrimitives<{
    type: 'object';
    properties: (typeof detectionsMappings)['properties'];
  }>,
  {
    '@timestamp': string;
  }
>;

export const detectionsDataStream: DataStreamDefinition<
  typeof detectionsMappings,
  StoredDetection
> = {
  name: DETECTIONS_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '90d' },
    mappings: detectionsMappings,
  },
};
