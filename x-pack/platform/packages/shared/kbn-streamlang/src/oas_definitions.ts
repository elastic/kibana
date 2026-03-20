/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Registry of kbn-streamlang Zod v4 schemas that should be emitted as named
 * OAS components (`$ref: '#/components/schemas/<key>'`) rather than inlined at
 * every use site.
 *
 * Pass this object to the OAS integration layer (e.g. call
 * `registerZodV4Component` from `@kbn/router-to-openapispec` for each entry)
 * to activate named references in the generated spec.
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
  Condition: conditionSchema,

  // DSL root and step types
  StreamlangDSL: streamlangDSLSchema,
  StreamlangStep: streamlangStepSchema,

  // Union of all processors (useful for $ref in generic processing endpoints)
  StreamlangProcessor: streamlangProcessorSchema,

  // Individual processors
  GrokProcessor: grokProcessorSchema,
  DissectProcessor: dissectProcessorSchema,
  DateProcessor: dateProcessorSchema,
  RenameProcessor: renameProcessorSchema,
  AppendProcessor: appendProcessorSchema,
  ConvertProcessor: convertProcessorSchema,
  RemoveByPrefixProcessor: removeByPrefixProcessorSchema,
  RemoveProcessor: removeProcessorSchema,
  DropDocumentProcessor: dropDocumentProcessorSchema,
  ReplaceProcessor: replaceProcessorSchema,
  RedactProcessor: redactProcessorSchema,
  MathProcessor: mathProcessorSchema,
  UppercaseProcessor: uppercaseProcessorSchema,
  LowercaseProcessor: lowercaseProcessorSchema,
  TrimProcessor: trimProcessorSchema,
  JoinProcessor: joinProcessorSchema,
  SplitProcessor: splitProcessorSchema,
  SortProcessor: sortProcessorSchema,
  ConcatProcessor: concatProcessorSchema,
  NetworkDirectionProcessor: networkDirectionProcessorSchema,
  ManualIngestPipelineProcessor: manualIngestPipelineProcessorSchema,
} as const;

export type StreamlangOasDefinitions = typeof streamlangOasDefinitions;
