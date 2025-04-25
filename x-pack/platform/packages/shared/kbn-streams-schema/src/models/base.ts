/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IModel, OmitName } from './core';
import { StreamQuery, streamQuerySchema } from '../queries';
import { ModelValidation, modelValidation } from './validation/model_validation';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace BaseStream {
  export interface Definition {
    name: string;
    description: string;
  }

  export type Source<TDefinition extends Definition = Definition> = TDefinition;

  export interface GetResponse<TDefinition extends Definition = Definition> {
    dashboards: string[];
    stream: TDefinition;
    queries: StreamQuery[];
  }

  export interface UpsertRequest<TDefinition extends Definition = Definition> {
    dashboards: string[];
    stream: OmitName<TDefinition>;
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
  }),
  Source: z.object({}),
  GetResponse: z.object({
    dashboards: z.array(z.string()),
    queries: z.array(streamQuerySchema),
  }),
  UpsertRequest: z.object({
    dashboards: z.array(z.string()),
    queries: z.array(streamQuerySchema),
  }),
});
