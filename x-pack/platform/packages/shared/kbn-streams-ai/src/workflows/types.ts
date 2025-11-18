/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { DashboardCreateRequestBody } from '@kbn/dashboard-plugin/server';
import type { CreateSLOInput } from '@kbn/slo-schema';
import type { MlPutJobRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ProcessingService } from './onboarding/processing/types';

export interface StreamWorkflowOperationStreamUpsertRequest {
  stream_upsert_request: Streams.all.UpsertRequest;
}

export interface StreamWorkflowOperationCreateDashboard {
  create_dashboard: DashboardCreateRequestBody;
}

export interface StreamWorkflowOperationCreateSLO {
  create_slo: CreateSLOInput;
}

export interface StreamWorkflowOperationCreateMLJob {
  create_ml_job: MlPutJobRequest;
}

export type StreamWorkflowOperation =
  | StreamWorkflowOperationStreamUpsertRequest
  | StreamWorkflowOperationCreateDashboard
  | StreamWorkflowOperationCreateSLO
  | StreamWorkflowOperationCreateMLJob;

export interface StreamWorkflowResultBase<TChange = unknown> {
  change: TChange;
  operations: StreamWorkflowOperation[];
}

export type StreamworkflowResult = StreamWorkflowResultBase<unknown>;

export interface StreamWorkflowContext<TStreamModel extends Streams.all.Model = Streams.all.Model> {
  start: number;
  end: number;
  logger: Logger;
  signal: AbortSignal;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  services: {
    streams: {
      updateStream(input: TStreamModel['UpsertRequest']): Promise<TStreamModel['Definition']>;
      processing: ProcessingService;
    };
  };
}

export interface StreamWorkflowInput<TStreamModel extends Streams.all.Model = Streams.all.Model> {
  stream: {
    definition: TStreamModel['Definition'];
  };
}

export interface StreamWorkflowGenerateResult<TChange = unknown> {
  change: TChange;
}

export interface StreamWorkflowApplyResult<
  TStreamModel extends Streams.all.Model = Streams.all.Model
> {
  status: 'success' | 'failure';
  stream: {
    definition: TStreamModel['Definition'];
  };
}

export interface StreamWorkflow<
  TModel extends Streams.all.Model = Streams.all.Model,
  TInput extends StreamWorkflowInput<TModel> = StreamWorkflowInput<TModel>,
  TGenerateResult extends StreamWorkflowGenerateResult<any> = StreamWorkflowGenerateResult<unknown>,
  TApplyResult extends StreamWorkflowApplyResult<TModel> = StreamWorkflowApplyResult<TModel>
> {
  generate(context: StreamWorkflowContext, input: TInput): Promise<TGenerateResult>;
  apply(
    context: StreamWorkflowContext,
    input: TInput,
    change: TGenerateResult['change']
  ): Promise<TApplyResult>;
}
