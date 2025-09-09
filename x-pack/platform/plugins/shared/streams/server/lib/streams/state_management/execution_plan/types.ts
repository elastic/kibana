/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
  IngestProcessorContainer,
  IngestPutPipelineRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { IngestStreamLifecycle, Streams } from '@kbn/streams-schema';
import type { StreamsMappingProperties } from '@kbn/streams-schema/src/fields';

export interface UpsertComponentTemplateAction {
  type: 'upsert_component_template';
  request: ClusterPutComponentTemplateRequest;
}

export interface DeleteComponentTemplateAction {
  type: 'delete_component_template';
  request: {
    name: string;
  };
}

export interface UpsertIndexTemplateAction {
  type: 'upsert_index_template';
  request: IndicesPutIndexTemplateRequest;
}

export interface DeleteIndexTemplateAction {
  type: 'delete_index_template';
  request: {
    name: string;
  };
}

export interface UpsertIngestPipelineAction {
  type: 'upsert_ingest_pipeline';
  stream: string;
  request: IngestPutPipelineRequest;
}

export interface DeleteIngestPipelineAction {
  type: 'delete_ingest_pipeline';
  request: {
    name: string;
  };
}

export interface AppendProcessorToIngestPipelineAction {
  type: 'append_processor_to_ingest_pipeline';
  pipeline: string;
  template: string;
  dataStream: string;
  processor: IngestProcessorContainer;
  referencePipeline: string;
}

export interface DeleteProcessorFromIngestPipelineAction {
  type: 'delete_processor_from_ingest_pipeline';
  pipeline: string;
  template: string;
  dataStream: string;
  referencePipeline: string;
}

export interface UpsertDatastreamAction {
  type: 'upsert_datastream';
  request: {
    name: string;
  };
}

export interface RolloverAction {
  type: 'rollover';
  request: {
    name: string;
  };
}

export interface UpdateDefaultIngestPipelineAction {
  type: 'update_default_ingest_pipeline';
  request: {
    name: string;
    pipeline: string | undefined;
  };
}

export interface UpdateLifecycleAction {
  type: 'update_lifecycle';
  request: {
    name: string;
    lifecycle: IngestStreamLifecycle;
  };
}

export interface UpdateDataStreamMappingsAction {
  type: 'update_data_stream_mappings';
  request: {
    name: string;
    mappings: StreamsMappingProperties;
  };
}

export interface DeleteDatastreamAction {
  type: 'delete_datastream';
  request: {
    name: string;
  };
}

export interface UpsertDotStreamsDocumentAction {
  type: 'upsert_dot_streams_document';
  request: Streams.all.Definition;
}

export interface DeleteDotStreamsDocumentAction {
  type: 'delete_dot_streams_document';
  request: {
    name: string;
  };
}

export interface DeleteQueriesAction {
  type: 'delete_queries';
  request: {
    name: string;
  };
}

export type ElasticsearchAction =
  | UpsertComponentTemplateAction
  | DeleteComponentTemplateAction
  | UpsertIndexTemplateAction
  | DeleteIndexTemplateAction
  | UpsertIngestPipelineAction
  | DeleteIngestPipelineAction
  | AppendProcessorToIngestPipelineAction
  | DeleteProcessorFromIngestPipelineAction
  | UpsertDatastreamAction
  | RolloverAction
  | UpdateLifecycleAction
  | DeleteDatastreamAction
  | UpdateDefaultIngestPipelineAction
  | UpsertDotStreamsDocumentAction
  | DeleteDotStreamsDocumentAction
  | UpdateDataStreamMappingsAction
  | DeleteQueriesAction;

export interface ActionsByType {
  upsert_component_template: UpsertComponentTemplateAction[];
  delete_component_template: DeleteComponentTemplateAction[];
  upsert_index_template: UpsertIndexTemplateAction[];
  delete_index_template: DeleteIndexTemplateAction[];
  upsert_ingest_pipeline: UpsertIngestPipelineAction[];
  delete_ingest_pipeline: DeleteIngestPipelineAction[];
  append_processor_to_ingest_pipeline: AppendProcessorToIngestPipelineAction[];
  delete_processor_from_ingest_pipeline: DeleteProcessorFromIngestPipelineAction[];
  upsert_datastream: UpsertDatastreamAction[];
  rollover: RolloverAction[];
  update_default_ingest_pipeline: UpdateDefaultIngestPipelineAction[];
  update_lifecycle: UpdateLifecycleAction[];
  delete_datastream: DeleteDatastreamAction[];
  upsert_dot_streams_document: UpsertDotStreamsDocumentAction[];
  delete_dot_streams_document: DeleteDotStreamsDocumentAction[];
  update_data_stream_mappings: UpdateDataStreamMappingsAction[];
  delete_queries: DeleteQueriesAction[];
}
