/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createIsNarrowSchema } from '../../../shared/type_guards';

export interface IngestStreamLifecycleDSL {
  dsl: {
    data_retention?: string;
    downsample?: DownsampleStep[];
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

export type ClassicIngestStreamEffectiveLifecycle =
  | IngestStreamLifecycle
  | IngestStreamLifecycleError
  | IngestStreamLifecycleDisabled;

export type IngestStreamLifecycleAll =
  | IngestStreamLifecycle
  | IngestStreamLifecycleError
  | IngestStreamLifecycleDisabled;

export type IngestStreamEffectiveLifecycle =
  | WiredIngestStreamEffectiveLifecycle
  | ClassicIngestStreamEffectiveLifecycle;

const downsampleStepSchema = z.object({
  after: z
    .string()
    .nonempty()
    .refine((val) => val.trim() !== '', 'No empty strings allowed'),
  fixed_interval: z
    .string()
    .nonempty()
    .refine((val) => val.trim() !== '', 'No empty strings allowed'),
});

const dslLifecycleSchema = z.object({
  dsl: z.object({
    data_retention: z.optional(
      z
        .string()
        .nonempty()
        .refine((val) => val.trim() !== '', 'No empty strings allowed')
    ),
    downsample: z.optional(z.array(downsampleStepSchema)),
  }),
});
const ilmLifecycleSchema = z.object({
  ilm: z.object({
    policy: z
      .string()
      .nonempty()
      .refine((val) => val.trim() !== '', 'No empty strings allowed'),
  }),
});
const inheritLifecycleSchema = z.object({ inherit: z.strictObject({}) });
const disabledLifecycleSchema = z.object({ disabled: z.strictObject({}) });
const errorLifecycleSchema = z.object({
  error: z.strictObject({
    message: z
      .string()
      .nonempty()
      .refine((val) => val.trim() !== '', 'No empty strings allowed'),
  }),
});

export const ingestStreamLifecycleSchema: z.Schema<IngestStreamLifecycle> = z.union([
  dslLifecycleSchema,
  ilmLifecycleSchema,
  inheritLifecycleSchema,
]);

export const classicIngestStreamEffectiveLifecycleSchema: z.Schema<ClassicIngestStreamEffectiveLifecycle> =
  z.union([ingestStreamLifecycleSchema, disabledLifecycleSchema, errorLifecycleSchema]);

const nonEmptyStringSchema = z
  .string()
  .nonempty()
  .refine((val) => val.trim() !== '', 'No empty strings allowed');

export const wiredIngestStreamEffectiveLifecycleSchema: z.Schema<WiredIngestStreamEffectiveLifecycle> =
  z.union([
    dslLifecycleSchema.extend({ from: nonEmptyStringSchema }),
    ilmLifecycleSchema.extend({ from: nonEmptyStringSchema }),
  ]);

export const ingestStreamEffectiveLifecycleSchema: z.Schema<IngestStreamEffectiveLifecycle> =
  z.union([classicIngestStreamEffectiveLifecycleSchema, wiredIngestStreamEffectiveLifecycleSchema]);

export const isDslLifecycle = createIsNarrowSchema(
  ingestStreamEffectiveLifecycleSchema,
  dslLifecycleSchema
);

export const isErrorLifecycle = createIsNarrowSchema(
  classicIngestStreamEffectiveLifecycleSchema,
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

export interface DownsampleStep {
  after: string;
  fixed_interval: string;
}

export interface IlmPolicyPhase {
  name: PhaseName;
  size_in_bytes: number;
  min_age?: string;
  downsample?: DownsampleStep;
  readonly?: boolean;
  searchable_snapshot?: string;
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
