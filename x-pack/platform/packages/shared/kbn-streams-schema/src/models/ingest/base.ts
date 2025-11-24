/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import type { StreamlangDSL } from '@kbn/streamlang';
import { streamlangDSLSchema } from '@kbn/streamlang';
import type { ModelValidation } from '../validation/model_validation';
import { modelValidation } from '../validation/model_validation';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import type { IngestStreamLifecycle } from './lifecycle';
import { ingestStreamLifecycleSchema } from './lifecycle';
import { BaseStream } from '../base';
import type { IngestStreamSettings } from './settings';
import { ingestStreamSettingsSchema } from './settings';
import type { FailureStore } from './failure_store';
import { failureStoreSchema } from './failure_store';

interface IngestStreamPrivileges {
  // User can change everything about the stream
  manage: boolean;
  // User can read stats (like size in bytes) about the stream
  monitor: boolean;
  // User can view general metadata about the stream
  view_index_metadata: boolean;
  // User can change the retention policy of the stream
  lifecycle: boolean;
  // User can simulate changes to the processing or the mapping of the stream
  simulate: boolean;
  // User can get data information using the text structure API (e.g. to detect the structure of a message)
  text_structure: boolean;
  // User can read failure store information
  read_failure_store: boolean;
  // User can manage failure store information
  manage_failure_store: boolean;
}

const ingestStreamPrivilegesSchema: z.Schema<IngestStreamPrivileges> = z.object({
  manage: z.boolean(),
  monitor: z.boolean(),
  view_index_metadata: z.boolean(),
  lifecycle: z.boolean(),
  simulate: z.boolean(),
  text_structure: z.boolean(),
  read_failure_store: z.boolean(),
  manage_failure_store: z.boolean(),
});

export interface IngestBase {
  lifecycle: IngestStreamLifecycle;
  processing: StreamlangDSL;
  settings: IngestStreamSettings;
  failure_store: FailureStore;
}

export const IngestBase: Validation<unknown, IngestBase> = validation(
  z.unknown(),
  z.object({
    lifecycle: ingestStreamLifecycleSchema,
    processing: streamlangDSLSchema,
    settings: ingestStreamSettingsSchema,
    failure_store: failureStoreSchema,
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
