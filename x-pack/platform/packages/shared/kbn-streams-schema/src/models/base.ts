/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IModel, OmitUpsertProps } from './core';
import type { StreamQuery } from '../queries';
import { streamQuerySchema } from '../queries';
import type { ModelValidation } from './validation/model_validation';
import { modelValidation } from './validation/model_validation';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace BaseStream {
  export interface QueryStreamReference {
    name: string;
  }

  export interface Definition {
    name: string;
    description: string;
    updated_at: string;
    /**
     * Child query streams that belong to this stream.
     * Names must follow the parent.childname naming convention.
     */
    query_streams?: QueryStreamReference[];
  }

  export type Source<TDefinition extends Definition = Definition> = TDefinition;

  export interface GetResponse<TDefinition extends Definition = Definition> {
    dashboards: string[];
    rules: string[];
    stream: TDefinition;
    queries: StreamQuery[];
  }

  export interface UpsertRequest<TDefinition extends Definition = Definition> {
    dashboards: string[];
    rules: string[];
    stream: OmitUpsertProps<TDefinition>;
    queries: StreamQuery[];
  }

  export interface Model {
    Definition: BaseStream.Definition;
    Source: BaseStream.Source;
    GetResponse: BaseStream.GetResponse;
    UpsertRequest: BaseStream.UpsertRequest;
  }
}

export const BaseStream: ModelValidation<IModel, BaseStream.Model> = modelValidation({
  Definition: z.object({
    name: z.string(),
    description: z.string(),
    updated_at: z.string().datetime(),
    query_streams: z
      .array(
        z.object({
          name: z.string(),
        })
      )
      .optional(),
  }),
  Source: z.object({}),
  GetResponse: z.object({
    dashboards: z.array(z.string()),
    rules: z.array(z.string()),
    queries: z.array(streamQuerySchema),
  }),
  UpsertRequest: z.object({
    dashboards: z.array(z.string()),
    rules: z.array(z.string()),
    queries: z.array(streamQuerySchema),
  }),
});
