/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { BaseStream } from '../base';
import {
  baseStreamDefinitionSchema,
  baseStreamGetResponseSchema,
  baseStreamUpsertDefinitionSchema,
  baseStreamUpsertRequestSchema,
} from '../base';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import type { InheritedFieldDefinition } from '../../fields';
import { inheritedFieldDefinitionSchema } from '../../fields';

/**
 * Query definition stored in the stream schema.
 * References an ES|QL view by name - the view is the source of truth for the actual query.
 */
export interface Query {
  view: string;
}

export interface QueryWithEsql extends Query {
  esql: string;
}

export const Query: Validation<unknown, Query> = validation(
  z.unknown(),
  z.object({
    view: z.string(),
  })
);

export const QueryWithEsql: Validation<unknown, QueryWithEsql> = validation(
  z.unknown(),
  z.object({
    view: z.string(),
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
    type: 'query';
    query: QueryWithEsql;
  }

  export type Source = BaseStream.Source<QueryStream.Definition>;

  export interface GetResponse extends BaseStream.GetResponse<Definition> {
    stream: Definition;
    inherited_fields: InheritedFieldDefinition;
  }

  export interface UpsertRequest extends BaseStream.UpsertRequest<Definition> {
    stream: Omit<BaseStream.UpsertRequest<Definition>['stream'], 'query'> & {
      query: QueryWithEsql;
    };
  }
}

const queryStreamDefinitionSchema = baseStreamDefinitionSchema
  .extend({
    type: z.literal('query'),
    query: QueryWithEsql.right,
  })
  .meta({ id: 'QueryStreamDefinition' });

const queryStreamGetResponseSchema = baseStreamGetResponseSchema
  .extend({
    stream: queryStreamDefinitionSchema,
    inherited_fields: inheritedFieldDefinitionSchema,
  })
  .meta({ id: 'QueryStreamGetResponse' });

const queryStreamUpsertRequestSchema = baseStreamUpsertRequestSchema
  .extend({
    stream: baseStreamUpsertDefinitionSchema.extend({
      type: z.literal('query'),
      query: QueryWithEsql.right,
    }),
  })
  .meta({ id: 'QueryStreamUpsertRequest' });

export const QueryStream: {
  Definition: Validation<BaseStream.Model['Definition'], QueryStream.Definition>;
  Source: Validation<BaseStream.Model['Definition'], QueryStream.Source>;
  GetResponse: Validation<BaseStream.Model['GetResponse'], QueryStream.GetResponse>;
  UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], QueryStream.UpsertRequest>;
} = {
  Definition: validation(
    queryStreamDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
    queryStreamDefinitionSchema
  ),
  Source: validation(
    queryStreamDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
    queryStreamDefinitionSchema
  ),
  GetResponse: validation(
    queryStreamGetResponseSchema as z.Schema<BaseStream.Model['GetResponse']>,
    queryStreamGetResponseSchema
  ),
  UpsertRequest: validation(
    queryStreamUpsertRequestSchema as z.Schema<BaseStream.Model['UpsertRequest']>,
    queryStreamUpsertRequestSchema
  ),
};

// Optimized implementation for Definition check - the fallback is a zod-based check
QueryStream.Definition.is = (
  stream: BaseStream.Model['Definition']
): stream is QueryStream.Definition => 'query' in stream;
