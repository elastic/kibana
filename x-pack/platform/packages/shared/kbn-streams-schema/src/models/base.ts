/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, isoDateTime } from '@kbn/zod/v4';
import type { OmitUpsertProps } from './core';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace BaseStream {
  export interface Definition {
    name: string;
    description: string;
    updated_at: string;
  }

  export type Source<TDefinition extends Definition = Definition> = TDefinition;

  /**
   * Stream read model. Significant-event queries are intentionally not included here.
   */
  export interface GetResponse<TDefinition extends Definition = Definition> {
    dashboards: string[];
    rules: string[];
    stream: TDefinition;
  }

  /**
   * Stream write model. Significant-event queries are intentionally not part of the upsert.
   * The `PUT` routes validate the body with `DeepStrict`, so a stray `queries` field is
   * rejected as an unrecognized key (HTTP 400); the GET→PUT converter
   * (`convertGetResponseIntoUpsertRequest`) never emits one.
   */
  export interface UpsertRequest<TDefinition extends Definition = Definition> {
    dashboards: string[];
    rules: string[];
    stream: OmitUpsertProps<TDefinition> & {
      /**
       * @deprecated Query streams have been removed. Accepted for backwards compatibility
       * with clients that round-trip older GET responses, and ignored.
       */
      query_streams?: Array<{ name: string }>;
    };
  }

  export interface Model {
    Definition: BaseStream.Definition;
    Source: BaseStream.Source;
    GetResponse: BaseStream.GetResponse;
    UpsertRequest: BaseStream.UpsertRequest;
  }
}

export const baseStreamDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  updated_at: isoDateTime(),
});

export const baseStreamGetResponseSchema = z.object({
  dashboards: z.array(z.string()),
  rules: z.array(z.string()),
});

export const baseStreamUpsertRequestSchema = z.object({
  dashboards: z.array(z.string()),
  rules: z.array(z.string()),
});

export const baseStreamUpsertDefinitionSchema = baseStreamDefinitionSchema
  .omit({
    name: true,
    updated_at: true,
  })
  .extend({
    query_streams: z
      .array(z.object({ name: z.string() }))
      .optional()
      .meta({
        deprecated: true,
        description:
          'Deprecated. Query streams have been removed; this field is accepted for backwards compatibility and ignored.',
      }),
  });
