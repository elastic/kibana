/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Registry of kbn-streamlang Zod v4 schemas emitted as named OAS components
 * (`$ref: '#/components/schemas/<key>'`). Each entry calls `.meta({ id })`
 * at definition time so the OAS generator picks it up automatically via the
 * Zod v4 global registry — no separate registration step required.
 */

import { conditionSchema } from '../types/conditions';
import { streamlangDSLSchema, streamlangStepSchema } from '../types/streamlang';
import {
  streamlangProcessorSchema,
  grokProcessorSchema,
  dissectProcessorSchema,
  dateProcessorSchema,
  renameProcessorSchema,
  appendProcessorSchema,
  convertProcessorSchema,
  removeByPrefixProcessorSchema,
  removeProcessorSchema,
  dropDocumentProcessorSchema,
  replaceProcessorSchema,
  redactProcessorSchema,
  mathProcessorSchema,
  uppercaseProcessorSchema,
  lowercaseProcessorSchema,
  trimProcessorSchema,
  joinProcessorSchema,
  splitProcessorSchema,
  sortProcessorSchema,
  concatProcessorSchema,
  networkDirectionProcessorSchema,
  manualIngestPipelineProcessorSchema,
} from '../types/processors';

export const streamlangOasDefinitions = {
  // Core condition — recursive schema referenced throughout routing and processing
  // .meta({ id: 'Condition' }) is applied at definition time in types/conditions.ts
  Condition: conditionSchema,

  // DSL root and step types
  StreamlangDSL: streamlangDSLSchema.meta({ id: 'StreamlangDSL' }),
  // .meta({ id: 'StreamlangStep' }) is applied at definition time in types/streamlang.ts
  StreamlangStep: streamlangStepSchema,

  // Union of all processors (useful for $ref in generic processing endpoints)
  StreamlangProcessor: streamlangProcessorSchema.meta({ id: 'StreamlangProcessor' }),

  // Individual processors
  GrokProcessor: grokProcessorSchema.meta({ id: 'GrokProcessor' }),
  DissectProcessor: dissectProcessorSchema.meta({ id: 'DissectProcessor' }),
  DateProcessor: dateProcessorSchema.meta({ id: 'DateProcessor' }),
  RenameProcessor: renameProcessorSchema.meta({ id: 'RenameProcessor' }),
  AppendProcessor: appendProcessorSchema.meta({ id: 'AppendProcessor' }),
  ConvertProcessor: convertProcessorSchema.meta({ id: 'ConvertProcessor' }),
  RemoveByPrefixProcessor: removeByPrefixProcessorSchema.meta({ id: 'RemoveByPrefixProcessor' }),
  RemoveProcessor: removeProcessorSchema.meta({ id: 'RemoveProcessor' }),
  DropDocumentProcessor: dropDocumentProcessorSchema.meta({ id: 'DropDocumentProcessor' }),
  ReplaceProcessor: replaceProcessorSchema.meta({ id: 'ReplaceProcessor' }),
  RedactProcessor: redactProcessorSchema.meta({ id: 'RedactProcessor' }),
  MathProcessor: mathProcessorSchema.meta({ id: 'MathProcessor' }),
  UppercaseProcessor: uppercaseProcessorSchema.meta({ id: 'UppercaseProcessor' }),
  LowercaseProcessor: lowercaseProcessorSchema.meta({ id: 'LowercaseProcessor' }),
  TrimProcessor: trimProcessorSchema.meta({ id: 'TrimProcessor' }),
  JoinProcessor: joinProcessorSchema.meta({ id: 'JoinProcessor' }),
  SplitProcessor: splitProcessorSchema.meta({ id: 'SplitProcessor' }),
  SortProcessor: sortProcessorSchema.meta({ id: 'SortProcessor' }),
  ConcatProcessor: concatProcessorSchema.meta({ id: 'ConcatProcessor' }),
  NetworkDirectionProcessor: networkDirectionProcessorSchema.meta({
    id: 'NetworkDirectionProcessor',
  }),
  ManualIngestPipelineProcessor: manualIngestPipelineProcessorSchema.meta({
    id: 'ManualIngestPipelineProcessor',
  }),
} as const;

export type StreamlangOasDefinitions = typeof streamlangOasDefinitions;
