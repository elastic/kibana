/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IModel, OmitName } from './core';
import { StreamQuery, streamQuerySchema } from '../queries';
import { ModelValidation, modelValidation } from './validation';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace base {
  export interface Definition {
    name: string;
    description: string;
  }

  export type Source = Definition;

  export interface GetResponse {
    dashboards: string[];
    stream: Definition;
    queries: StreamQuery[];
  }

  export interface UpsertRequest {
    dashboards: string[];
    stream: OmitName<Definition>;
    queries: StreamQuery[];
  }

  export interface Model {
    Definition: base.Definition;
    Source: base.Source;
    GetResponse: base.GetResponse;
    UpsertRequest: base.UpsertRequest;
  }
}

export const base: ModelValidation<IModel, base.Model> = modelValidation({
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
