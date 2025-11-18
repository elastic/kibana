/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { InferenceConnector } from '@kbn/inference-common';
import type { StreamlangProcessorDefinition } from '@kbn/streamlang';
import type { InferenceCliClient } from '@kbn/inference-cli';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { KibanaClient } from '@kbn/kibana-api-cli';

export interface MenuState {
  connector?: InferenceConnector;
  stream?: Streams.ingest.all.Definition;
  timeRangeId: string;
}

export interface ActionDependencies {
  inferenceClient: InferenceCliClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  kibanaClient: KibanaClient;
}

export interface ActionServices {
  kibanaClient: KibanaClient;
}

export interface ActionContext extends ActionDependencies {
  stream: Streams.ingest.all.Definition;
  start: number;
  end: number;
  services: ActionServices;
}

export interface StreamActionResult {
  label: string;
  description?: string;
  body: unknown;
}

export interface StreamAction {
  id: string;
  label: string;
  description: string;
  run: (context: ActionContext) => Promise<StreamActionResult>;
}

// Workflow menu item wrapper
export interface StreamWorkflowMenuItem {
  id: string;
  label: string;
  description: string;
  generate: (context: ActionContext) => Promise<{ change: unknown }>;
  apply: (context: ActionContext, change: unknown) => Promise<{ status: string }>;
}

export type StreamMenuItem =
  | { kind: 'action'; action: StreamAction }
  | { kind: 'workflow'; workflow: StreamWorkflowMenuItem };

export type ProcessorDefinitionWithId = StreamlangProcessorDefinition & { id: string };
