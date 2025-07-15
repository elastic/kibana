/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RenameFieldsAndRemoveAction, zodRenameFieldsAndRemoveAction } from '../utils';
import {
  GrokProcessor,
  grokProcessorSchema,
  DissectProcessor,
  DateProcessor,
  RenameProcessor,
  SetProcessor,
  ManualIngestPipelineProcessor,
  dateProcessorSchema,
  dissectProcessorSchema,
  manualIngestPipelineProcessorSchema,
  renameProcessorSchema,
  setProcessorSchema,
  appendProcessorSchema,
  AppendProcessor,
} from '.';

/** Ingest Pipeline processor configurations very closely resemble Streamlang DSL action blocks */

// Grok
export type IngestPipelineGrokProcessor = RenameFieldsAndRemoveAction<
  GrokProcessor,
  { from: 'field'; where: 'if' }
>;

export const ingestPipelineGrokProcessorSchema = zodRenameFieldsAndRemoveAction(
  grokProcessorSchema,
  { from: 'field', where: 'if' }
);

// Dissect
export type IngestPipelineDissectProcessor = RenameFieldsAndRemoveAction<
  DissectProcessor,
  { from: 'field'; where: 'if' }
>;

export const ingestPipelineDissectProcessorSchema = zodRenameFieldsAndRemoveAction(
  dissectProcessorSchema,
  { from: 'field', where: 'if' }
);

// Date
export type IngestPipelineDateProcessor = RenameFieldsAndRemoveAction<
  DateProcessor,
  { from: 'field'; to: 'target_field'; where: 'if' }
>;

export const ingestPipelineDateProcessorSchema = zodRenameFieldsAndRemoveAction(
  dateProcessorSchema,
  { from: 'field', to: 'target_field', where: 'if' }
);

// Rename
export type IngestPipelineRenameProcessor = RenameFieldsAndRemoveAction<
  RenameProcessor,
  { from: 'field'; to: 'target_field'; where: 'if' }
>;

export const ingestPipelineRenameProcessorSchema = zodRenameFieldsAndRemoveAction(
  renameProcessorSchema,
  { from: 'field', to: 'target_field', where: 'if' }
);

// Set
export type IngestPipelineSetProcessor = RenameFieldsAndRemoveAction<
  SetProcessor,
  { to: 'field'; where: 'if' }
>;

export const ingestPipelineSetProcessorSchema = zodRenameFieldsAndRemoveAction(setProcessorSchema, {
  to: 'field',
  where: 'if',
});

// Append
export type IngestPipelineAppendProcessor = RenameFieldsAndRemoveAction<
  AppendProcessor,
  { to: 'field'; where: 'if' }
>;

export const ingestPipelineAppendProcessorSchema = zodRenameFieldsAndRemoveAction(
  appendProcessorSchema,
  { to: 'field', where: 'if' }
);

// Manual Ingest Pipeline (escape hatch)
export type IngestPipelineManualIngestPipelineProcessor = RenameFieldsAndRemoveAction<
  ManualIngestPipelineProcessor,
  { where: 'if' }
>;

export const ingestPipelineManualIngestPipelineProcessorSchema = zodRenameFieldsAndRemoveAction(
  manualIngestPipelineProcessorSchema,
  { where: 'if' }
);

export type IngestPipelineProcessor =
  | IngestPipelineGrokProcessor
  | IngestPipelineDissectProcessor
  | IngestPipelineDateProcessor
  | IngestPipelineRenameProcessor
  | IngestPipelineSetProcessor
  | IngestPipelineAppendProcessor
  | IngestPipelineManualIngestPipelineProcessor;
