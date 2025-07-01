/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { ModelValidation, modelValidation } from '../validation/model_validation';
import { Validation, validation } from '../validation/validation';
import { IngestStreamLifecycle, ingestStreamLifecycleSchema } from './lifecycle';
import { ProcessorDefinition, processorDefinitionSchema } from './processors';
import { BaseStream } from '../base';

interface IngestStreamPrivileges {
  // User can change everything about the stream
  manage: boolean;
  // User can read stats (like size in bytes) about the stream
  monitor: boolean;
  // User can change the retention policy of the stream
  lifecycle: boolean;
  // User can simulate changes to the processing or the mapping of the stream
  simulate: boolean;
  // User can get data information using the text structure API (e.g. to detect the structure of a message)
  text_structure: boolean;
}

const ingestStreamPrivilegesSchema: z.Schema<IngestStreamPrivileges> = z.object({
  manage: z.boolean(),
  monitor: z.boolean(),
  lifecycle: z.boolean(),
  simulate: z.boolean(),
  text_structure: z.boolean(),
});

export interface IngestBase {
  lifecycle: IngestStreamLifecycle;
  processing: ProcessorDefinition[];
}

export const IngestBase: Validation<unknown, IngestBase> = validation(
  z.unknown(),
  z.object({
    lifecycle: ingestStreamLifecycleSchema,
    processing: z.array(processorDefinitionSchema),
  })
);

/* eslint-disable @typescript-eslint/no-namespace */
export namespace IngestBaseStream {
  export interface Definition extends BaseStream.Definition {
    ingest: IngestBase;
  }

  export type Source<
    TDefinition extends IngestBaseStream.Definition = IngestBaseStream.Definition
  > = BaseStream.Source<TDefinition>;

  export interface GetResponse<
    TDefinition extends IngestBaseStream.Definition = IngestBaseStream.Definition
  > extends BaseStream.GetResponse<TDefinition> {
    privileges: IngestStreamPrivileges;
  }

  export type UpsertRequest<
    TDefinition extends IngestBaseStream.Definition = IngestBaseStream.Definition
  > = BaseStream.UpsertRequest<TDefinition>;

  export interface Model {
    Definition: IngestBaseStream.Definition;
    Source: IngestBaseStream.Source;
    GetResponse: IngestBaseStream.GetResponse;
    UpsertRequest: IngestBaseStream.UpsertRequest;
  }
}

export const IngestBaseStream: ModelValidation<BaseStream.Model, IngestBaseStream.Model> =
  modelValidation(BaseStream, {
    Source: z.object({}),
    Definition: z.object({
      ingest: IngestBase.right,
    }),
    GetResponse: z.object({
      privileges: ingestStreamPrivilegesSchema,
    }),
    UpsertRequest: z.object({}),
  });
