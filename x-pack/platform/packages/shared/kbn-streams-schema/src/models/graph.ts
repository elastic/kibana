/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { recursiveRecord } from '../shared/record_types';

const graphNodeSchema = recursiveRecord;
const graphNodesSchema = z.array(graphNodeSchema).max(2000);

export const streamsGraphConfigurationSchema = z.object({
  sources: graphNodesSchema,
  pipeline_definitions: graphNodesSchema,
  pipelines: graphNodesSchema,
  routing_nodes: graphNodesSchema,
  destinations: graphNodesSchema,
});

export const streamsGraphUiMetadataSchema = recursiveRecord.default({});

export const streamsGraphResponseSchema = z.object({
  graph: streamsGraphConfigurationSchema,
  ui_metadata: streamsGraphUiMetadataSchema,
});

export const streamsGraphUpsertRequestSchema = streamsGraphResponseSchema;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace StreamsGraph {
  export type Node = z.infer<typeof graphNodeSchema>;
  export type Configuration = z.infer<typeof streamsGraphConfigurationSchema>;
  export type UiMetadata = z.infer<typeof streamsGraphUiMetadataSchema>;
  export type GetResponse = z.infer<typeof streamsGraphResponseSchema>;
  export type UpsertRequest = z.infer<typeof streamsGraphUpsertRequestSchema>;
  export type ConfigurationSavedObjectAttributes = Configuration;
  export interface UiMetadataSavedObjectAttributes {
    metadata: UiMetadata;
  }
}
