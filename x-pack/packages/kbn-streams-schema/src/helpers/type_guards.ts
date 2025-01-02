/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ZodSchema } from '@kbn/zod';
import {
  AndCondition,
  conditionSchema,
  dissectProcessingDefinitionSchema,
  DissectProcssingDefinition,
  FilterCondition,
  filterConditionSchema,
  GrokProcessingDefinition,
  grokProcessingDefinitionSchema,
  IngestReadStreamDefinition,
  ingestReadStreamDefinitonSchema,
  IngestStreamDefinition,
  ingestStreamDefinitonSchema,
  OrCondition,
  ReadStreamDefinition,
  readStreamDefinitonSchema,
  StreamDefinition,
  streamDefintionSchema,
  WiredReadStreamDefinition,
  wiredReadStreamDefinitonSchema,
  WiredStreamDefinition,
  wiredStreamDefinitonSchema,
} from '../models';
import {
  IngestStreamConfigDefinition,
  ingestStreamConfigDefinitonSchema,
  StreamConfigDefinition,
  streamConfigDefinitionSchema,
  WiredStreamConfigDefinition,
  wiredStreamConfigDefinitonSchema,
} from '../models/stream_config';

export function isSchema<T>(zodSchema: ZodSchema, subject: T) {
  try {
    zodSchema.parse(subject);
    return true;
  } catch (e) {
    return false;
  }
}

export function isReadStream(subject: any): subject is ReadStreamDefinition {
  return isSchema(readStreamDefinitonSchema, subject);
}

export function isWiredReadStream(subject: any): subject is WiredReadStreamDefinition {
  return isSchema(wiredReadStreamDefinitonSchema, subject);
}

export function isIngestReadStream(subject: any): subject is IngestReadStreamDefinition {
  return isSchema(ingestReadStreamDefinitonSchema, subject);
}

export function isStream(subject: any): subject is StreamDefinition {
  return isSchema(streamDefintionSchema, subject);
}

export function isIngestStream(
  subject: IngestStreamDefinition | WiredStreamDefinition
): subject is IngestStreamDefinition {
  return isSchema(ingestStreamDefinitonSchema, subject);
}

export function isWiredStream(
  subject: IngestStreamDefinition | WiredStreamDefinition
): subject is WiredStreamDefinition {
  return isSchema(wiredStreamDefinitonSchema, subject);
}

export function isWiredStreamConfig(subject: any): subject is WiredStreamConfigDefinition {
  return isSchema(wiredStreamConfigDefinitonSchema, subject);
}

export function isIngestStreamConfig(subject: any): subject is IngestStreamConfigDefinition {
  return isSchema(ingestStreamConfigDefinitonSchema, subject);
}

export function isStreamConfig(subject: any): subject is StreamConfigDefinition {
  return isSchema(streamConfigDefinitionSchema, subject);
}

export function isGrokProcessor(subject: any): subject is GrokProcessingDefinition {
  return isSchema(grokProcessingDefinitionSchema, subject);
}

export function isDissectProcessor(subject: any): subject is DissectProcssingDefinition {
  return isSchema(dissectProcessingDefinitionSchema, subject);
}

export function isFilterCondition(subject: any): subject is FilterCondition {
  return isSchema(filterConditionSchema, subject);
}

export function isAndCondition(subject: any): subject is AndCondition {
  return isSchema(conditionSchema, subject) && subject.and != null;
}

export function isOrCondition(subject: any): subject is OrCondition {
  return isSchema(conditionSchema, subject) && subject.or != null;
}
