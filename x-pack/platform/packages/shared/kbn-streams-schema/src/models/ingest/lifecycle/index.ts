/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { createIsNarrowSchema } from '../../../shared/type_guards';

export interface IngestStreamLifecycleDSL {
  dsl: {
    data_retention?: string;
  };
}

export interface IngestStreamLifecycleILM {
  ilm: {
    policy: string;
  };
}

export interface IngestStreamLifecycleError {
  error: {
    message: string;
  };
}

export interface IngestStreamLifecycleInherit {
  inherit: {};
}

export interface IngestStreamLifecycleDisabled {
  disabled: {};
}

export type IngestStreamLifecycle =
  | IngestStreamLifecycleDSL
  | IngestStreamLifecycleILM
  | IngestStreamLifecycleInherit;

export type WiredIngestStreamEffectiveLifecycle = (
  | IngestStreamLifecycleDSL
  | IngestStreamLifecycleILM
) & { from: string };

export type UnwiredIngestStreamEffectiveLifecycle =
  | IngestStreamLifecycle
  | IngestStreamLifecycleError
  | IngestStreamLifecycleDisabled;

export type IngestStreamEffectiveLifecycle =
  | WiredIngestStreamEffectiveLifecycle
  | UnwiredIngestStreamEffectiveLifecycle;

const dslLifecycleSchema = z.object({
  dsl: z.object({ data_retention: z.optional(NonEmptyString) }),
});
const ilmLifecycleSchema = z.object({ ilm: z.object({ policy: NonEmptyString }) });
const inheritLifecycleSchema = z.object({ inherit: z.strictObject({}) });
const disabledLifecycleSchema = z.object({ disabled: z.strictObject({}) });
const errorLifecycleSchema = z.object({ error: z.strictObject({ message: NonEmptyString }) });

export const ingestStreamLifecycleSchema: z.Schema<IngestStreamLifecycle> = z.union([
  dslLifecycleSchema,
  ilmLifecycleSchema,
  inheritLifecycleSchema,
]);

export const unwiredIngestStreamEffectiveLifecycleSchema: z.Schema<UnwiredIngestStreamEffectiveLifecycle> =
  z.union([ingestStreamLifecycleSchema, disabledLifecycleSchema, errorLifecycleSchema]);

export const wiredIngestStreamEffectiveLifecycleSchema: z.Schema<WiredIngestStreamEffectiveLifecycle> =
  z.union([dslLifecycleSchema, ilmLifecycleSchema]).and(z.object({ from: NonEmptyString }));

export const ingestStreamEffectiveLifecycleSchema: z.Schema<IngestStreamEffectiveLifecycle> =
  z.union([unwiredIngestStreamEffectiveLifecycleSchema, wiredIngestStreamEffectiveLifecycleSchema]);

export const isDslLifecycle = createIsNarrowSchema(
  ingestStreamEffectiveLifecycleSchema,
  dslLifecycleSchema
);

export const isErrorLifecycle = createIsNarrowSchema(
  unwiredIngestStreamEffectiveLifecycleSchema,
  errorLifecycleSchema
);

export const isIlmLifecycle = createIsNarrowSchema(
  ingestStreamEffectiveLifecycleSchema,
  ilmLifecycleSchema
);

export const isInheritLifecycle = createIsNarrowSchema(
  ingestStreamEffectiveLifecycleSchema,
  inheritLifecycleSchema
);

export const isDisabledLifecycle = createIsNarrowSchema(
  ingestStreamEffectiveLifecycleSchema,
  disabledLifecycleSchema
);

export type PhaseName = 'hot' | 'warm' | 'cold' | 'frozen' | 'delete';

export interface IlmPolicyPhase {
  name: PhaseName;
  size_in_bytes: number;
  min_age?: string;
}

export interface IlmPolicyHotPhase extends IlmPolicyPhase {
  name: 'hot';
  rollover: {
    max_size?: number | string;
    max_primary_shard_size?: number | string;
    max_age?: string;
    max_docs?: number;
    max_primary_shard_docs?: number;
  };
}

export interface IlmPolicyDeletePhase {
  name: 'delete';
  min_age: string;
}

export interface IlmPolicyPhases {
  hot?: IlmPolicyHotPhase;
  warm?: IlmPolicyPhase;
  cold?: IlmPolicyPhase;
  frozen?: IlmPolicyPhase;
  delete?: IlmPolicyDeletePhase;
}
