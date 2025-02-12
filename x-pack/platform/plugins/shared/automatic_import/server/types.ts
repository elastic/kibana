/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionsClientBedrockChatModel,
  ActionsClientChatOpenAI,
  ActionsClientGeminiChatModel,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type {
  PluginStartContract as ActionsPluginStart,
  PluginSetupContract as ActionsPluginSetup,
} from '@kbn/actions-plugin/server/plugin';
import { ESProcessorItem, SamplesFormat, CelAuthType } from '../common';

export interface AutomaticImportPluginSetup {
  setIsAvailable: (isAvailable: boolean) => void;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AutomaticImportPluginStart {}

export interface AutomaticImportPluginSetupDependencies {
  licensing: LicensingPluginSetup;
  actions: ActionsPluginSetup;
}
export interface AutomaticImportPluginStartDependencies {
  licensing: LicensingPluginStart;
  actions: ActionsPluginStart;
}

export interface SimplifiedProcessor {
  if?: string;
  field: string;
  value_from?: string;
  value?: string;
}

export interface SimplifiedProcessors {
  type: string;
  processors: SimplifiedProcessor[];
}

export interface ApiAnalysisState {
  dataStreamName: string;
  pathOptions: object;
  results: object;
  suggestedPaths: string[];
  lastExecutedChain: string;
}

export interface CategorizationState {
  rawSamples: string[];
  samples: string[];
  ecsTypes: string;
  ecsCategories: string;
  exAnswer: string;
  lastExecutedChain: string;
  packageName: string;
  dataStreamName: string;
  errors: object;
  previousError: string;
  pipelineResults: object[];
  previousPipelineResults: object[];
  lastReviewedSamples: number[]; // Filled when reviewing.
  stableSamples: number[]; // Samples that did not change due to a review.
  reviewCount: number;
  finalized: boolean;
  currentPipeline: object;
  currentProcessors: object[];
  invalidCategorization: object[];
  previousInvalidCategorization: string;
  initialPipeline: object;
  results: object;
  samplesFormat: SamplesFormat;
}

export interface CelInputState {
  dataStreamName: string;
  path: string;
  authType: CelAuthType;
  openApiPathDetails: object;
  openApiSchemas: object;
  openApiAuthSchema: object;
  lastExecutedChain: string;
  finalized: boolean;
  apiQuerySummary: string;
  currentProgram: string;
  hasProgramHeaders: boolean | undefined;
  stateVarNames: string[];
  stateSettings: object;
  configFields: object;
  redactVars: string[];
  results: object;
}

export interface EcsMappingState {
  ecs: string;
  chunkSize: number;
  lastExecutedChain: string;
  rawSamples: string[];
  additionalProcessors: ESProcessorItem[];
  prefixedSamples: string[];
  combinedSamples: string;
  sampleChunks: string[];
  exAnswer: string;
  packageName: string;
  dataStreamName: string;
  finalized: boolean;
  currentMapping: object;
  finalMapping: object;
  chunkMapping: object;
  useFinalMapping: boolean;
  hasTriedOnce: boolean;
  currentPipeline: object;
  duplicateFields: string[];
  missingKeys: string[];
  invalidEcsFields: string[];
  results: object;
  samplesFormat: SamplesFormat;
  ecsVersion: string;
}

export interface LogFormatDetectionState {
  lastExecutedChain: string;
  packageName: string;
  dataStreamName: string;
  packageTitle: string;
  dataStreamTitle: string;
  logSamples: string[];
  jsonSamples: string[];
  exAnswer: string;
  finalized: boolean;
  samplesFormat: SamplesFormat;
  header: boolean;
  ecsVersion: string;
  results: object;
  additionalProcessors: ESProcessorItem[]; // Generated in handleXXX nodes or subgraphs.
}

export interface KVState {
  lastExecutedChain: string;
  packageName: string;
  dataStreamName: string;
  kvProcessor: ESProcessorItem;
  grokPattern: string;
  logSamples: string[];
  kvLogMessages: string[];
  jsonSamples: string[];
  finalized: boolean;
  header: boolean;
  errors: object;
  additionalProcessors: object[];
  ecsVersion: string;
}

export interface UnstructuredLogState {
  lastExecutedChain: string;
  packageName: string;
  dataStreamName: string;
  grokPatterns: string[];
  logSamples: string[];
  jsonSamples: string[];
  finalized: boolean;
  errors: object;
  additionalProcessors: object[];
  ecsVersion: string;
}

export interface RelatedState {
  rawSamples: string[];
  samples: string[];
  ecs: string;
  exAnswer: string;
  packageName: string;
  dataStreamName: string;
  errors: object;
  previousError: string;
  pipelineResults: object[];
  finalized: boolean;
  reviewed: boolean;
  hasTriedOnce: boolean;
  currentPipeline: object;
  currentProcessors: object[];
  initialPipeline: object;
  results: object;
  lastExecutedChain: string;
  samplesFormat: SamplesFormat;
}

export type ChatModels =
  | ActionsClientChatOpenAI
  | ActionsClientBedrockChatModel
  | ActionsClientSimpleChatModel
  | ActionsClientGeminiChatModel;
