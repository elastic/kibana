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
  type: 'dsl';
  dsl: {
    data_retention?: string;
  };
}

export interface IngestStreamLifecycleILM {
  type: 'ilm';
  ilm: {
    policy: string;
  };
}

export interface IngestStreamLifecycleError {
  type: 'error';
  error: {
    message: string;
  };
}

export interface IngestStreamLifecycleInherit {
  type: 'inherit';
  inherit: {};
}

export interface IngestStreamLifecycleDisabled {
  type: 'disabled';
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

const inferLifecycleType = (
  value: Record<string, unknown>,
  allowed: Array<IngestStreamLifecycleAll['type']>
): IngestStreamLifecycleAll['type'] | undefined => {
  if ('dsl' in value && allowed.includes('dsl')) {
    return 'dsl';
  }
  if ('ilm' in value && allowed.includes('ilm')) {
    return 'ilm';
  }
  if ('inherit' in value && allowed.includes('inherit')) {
    return 'inherit';
  }
  if ('disabled' in value && allowed.includes('disabled')) {
    return 'disabled';
  }
  if ('error' in value && allowed.includes('error')) {
    return 'error';
  }
  return undefined;
};

const dslLifecycleSchema = z.object({
  type: z.literal('dsl'),
  dsl: z.object({ data_retention: z.optional(NonEmptyString) }),
});
const ilmLifecycleSchema = z.object({
  type: z.literal('ilm'),
  ilm: z.object({ policy: NonEmptyString }),
});
const inheritLifecycleSchema = z.object({
  type: z.literal('inherit'),
  inherit: z.strictObject({}),
});
const disabledLifecycleSchema = z.object({
  type: z.literal('disabled'),
  disabled: z.strictObject({}),
});
const errorLifecycleSchema = z.object({
  type: z.literal('error'),
  error: z.strictObject({ message: NonEmptyString }),
});

const ingestStreamLifecycleInnerSchema = z.discriminatedUnion('type', [
  dslLifecycleSchema,
  ilmLifecycleSchema,
  inheritLifecycleSchema,
]);

export const ingestStreamLifecycleSchema: z.Schema<IngestStreamLifecycle> = z.preprocess(
  (value) => {
    if (value && typeof value === 'object' && !('type' in (value as Record<string, unknown>))) {
      const inferred = inferLifecycleType(value as Record<string, unknown>, [
        'dsl',
        'ilm',
        'inherit',
      ]);
      if (inferred) {
        return { ...(value as Record<string, unknown>), type: inferred };
      }
    }
    return value;
  },
  ingestStreamLifecycleInnerSchema
) as unknown as z.Schema<IngestStreamLifecycle>;

const classicIngestStreamEffectiveLifecycleInnerSchema = z.discriminatedUnion('type', [
  dslLifecycleSchema,
  ilmLifecycleSchema,
  inheritLifecycleSchema,
  disabledLifecycleSchema,
  errorLifecycleSchema,
]);

export const classicIngestStreamEffectiveLifecycleSchema: z.Schema<ClassicIngestStreamEffectiveLifecycle> =
  z.preprocess((value) => {
    if (value && typeof value === 'object' && !('type' in (value as Record<string, unknown>))) {
      const inferred = inferLifecycleType(value as Record<string, unknown>, [
        'dsl',
        'ilm',
        'inherit',
        'disabled',
        'error',
      ]);
      if (inferred) {
        return { ...(value as Record<string, unknown>), type: inferred };
      }
    }
    return value;
  }, classicIngestStreamEffectiveLifecycleInnerSchema) as unknown as z.Schema<ClassicIngestStreamEffectiveLifecycle>;

const wiredIngestStreamEffectiveLifecycleInnerSchema = z
  .discriminatedUnion('type', [dslLifecycleSchema, ilmLifecycleSchema])
  .and(z.object({ from: NonEmptyString }));

export const wiredIngestStreamEffectiveLifecycleSchema: z.Schema<WiredIngestStreamEffectiveLifecycle> =
  z.preprocess((value) => {
    if (value && typeof value === 'object' && !('type' in (value as Record<string, unknown>))) {
      const inferred = inferLifecycleType(value as Record<string, unknown>, ['dsl', 'ilm']);
      if (inferred) {
        return { ...(value as Record<string, unknown>), type: inferred };
      }
    }
    return value;
  }, wiredIngestStreamEffectiveLifecycleInnerSchema) as unknown as z.Schema<WiredIngestStreamEffectiveLifecycle>;

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
