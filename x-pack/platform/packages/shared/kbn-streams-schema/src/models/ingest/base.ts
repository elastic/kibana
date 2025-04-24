/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { base } from '../base';
import { IngestStreamLifecycle, ingestStreamLifecycleSchema } from './lifecycle';
import { ProcessorDefinition, processorDefinitionSchema } from './processors';
import { OmitName } from '../core';
import { Validation, validation } from '../validation/validation';
import { ModelValidation, modelValidation } from '../validation/model_validation';

interface IngestStreamPrivileges {
  // User can change everything about the stream
  manage: boolean;
  // User can read stats (like size in bytes) about the stream
  monitor: boolean;
  // User can change the retention policy of the stream
  lifecycle: boolean;
  // User can simulate changes to the processing or the mapping of the stream
  simulate: boolean;
}

const ingestStreamPrivilegesSchema: z.Schema<IngestStreamPrivileges> = z.object({
  manage: z.boolean(),
  monitor: z.boolean(),
  lifecycle: z.boolean(),
  simulate: z.boolean(),
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
export namespace ingestBase {
  export interface Definition extends base.Definition {
    ingest: IngestBase;
  }

  export interface Source extends base.Source, ingestBase.Definition {}

  export interface GetResponse extends base.GetResponse {
    stream: Definition;
    privileges: IngestStreamPrivileges;
  }

  export interface UpsertRequest extends base.UpsertRequest {
    stream: OmitName<Definition>;
  }

  export interface Model {
    Definition: ingestBase.Definition;
    Source: ingestBase.Source;
    GetResponse: ingestBase.GetResponse;
    UpsertRequest: ingestBase.UpsertRequest;
  }
}

export const ingestBase: ModelValidation<base.Model, ingestBase.Model> = modelValidation(base, {
  Source: z.object({}),
  Definition: z.object({
    ingest: IngestBase.right,
  }),
  GetResponse: z.object({
    privileges: ingestStreamPrivilegesSchema,
  }),
  UpsertRequest: z.object({}),
});
