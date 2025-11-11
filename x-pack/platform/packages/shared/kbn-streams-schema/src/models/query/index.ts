/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { BaseStream } from '../base';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import type { ModelValidation } from '../validation/model_validation';
import { modelValidation } from '../validation/model_validation';
import type { InheritedFieldDefinition } from '../../fields';
import { inheritedFieldDefinitionSchema } from '../../fields';

export interface Query {
  esql: string;
}

export const Query: Validation<unknown, Query> = validation(
  z.unknown(),
  z.object({
    esql: z.string(),
  })
);

/* eslint-disable @typescript-eslint/no-namespace */
export namespace QueryStream {
  export interface Model {
    Definition: QueryStream.Definition;
    Source: QueryStream.Source;
    GetResponse: QueryStream.GetResponse;
    UpsertRequest: QueryStream.UpsertRequest;
  }

  export interface Definition extends BaseStream.Definition {
    query: Query;
  }

  export type Source = BaseStream.Source<QueryStream.Definition>;

  export interface GetResponse extends BaseStream.GetResponse<Definition> {
    inherited_fields: InheritedFieldDefinition;
    sub_query_streams: string[];
  }

  export type UpsertRequest = BaseStream.UpsertRequest<Definition>;
}

export const QueryStream: ModelValidation<BaseStream.Model, QueryStream.Model> = modelValidation(
  BaseStream,
  {
    Source: z.object({}),
    Definition: z.object({
      query: Query.right,
    }),
    GetResponse: z.object({
      inherited_fields: inheritedFieldDefinitionSchema,
      sub_query_streams: z.array(z.string()),
    }),
    UpsertRequest: z.object({}),
  }
);

// Optimized implementation for Definition check - the fallback is a zod-based check
QueryStream.Definition.is = (
  stream: BaseStream.Model['Definition']
): stream is QueryStream.Definition => 'query' in stream;
