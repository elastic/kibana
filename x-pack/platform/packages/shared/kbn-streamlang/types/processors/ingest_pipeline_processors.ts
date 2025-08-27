/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenameFieldsAndRemoveAction } from '../utils';
import type {
  GrokProcessor,
  DissectProcessor,
  DateProcessor,
  RenameProcessor,
  SetProcessor,
  ManualIngestPipelineProcessor,
  AppendProcessor,
} from '.';

/** Ingest Pipeline processor configurations very closely resemble Streamlang DSL action blocks */

// Grok
export type IngestPipelineGrokProcessor = RenameFieldsAndRemoveAction<
  GrokProcessor,
  { from: 'field'; where: 'if' }
>;

// Dissect
export type IngestPipelineDissectProcessor = RenameFieldsAndRemoveAction<
  DissectProcessor,
  { from: 'field'; where: 'if' }
>;

// Date
export type IngestPipelineDateProcessor = RenameFieldsAndRemoveAction<
  DateProcessor,
  { from: 'field'; to: 'target_field'; where: 'if' }
>;

// Rename
export type IngestPipelineRenameProcessor = RenameFieldsAndRemoveAction<
  RenameProcessor,
  { from: 'field'; to: 'target_field'; where: 'if' }
>;

// Set
export type IngestPipelineSetProcessor = RenameFieldsAndRemoveAction<
  SetProcessor,
  { to: 'field'; where: 'if' }
>;

// Append
export type IngestPipelineAppendProcessor = RenameFieldsAndRemoveAction<
  AppendProcessor,
  { to: 'field'; where: 'if' }
>;

// Manual Ingest Pipeline (escape hatch)
export type IngestPipelineManualIngestPipelineProcessor = RenameFieldsAndRemoveAction<
  ManualIngestPipelineProcessor,
  { where: 'if' }
>;

export type IngestPipelineProcessor =
  | IngestPipelineGrokProcessor
  | IngestPipelineDissectProcessor
  | IngestPipelineDateProcessor
  | IngestPipelineRenameProcessor
  | IngestPipelineSetProcessor
  | IngestPipelineAppendProcessor
  | IngestPipelineManualIngestPipelineProcessor;
