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

export const QueryStream: ModelValidation<BaseStream.Model, QueryStream.Model> = modelValidation(
  BaseStream,
  {
    Source: z.object({}),
    Definition: z.object({
      query: QueryWithEsql.right,
    }),
    GetResponse: z.object({
      inherited_fields: inheritedFieldDefinitionSchema,
    }),
    UpsertRequest: z.object({
      stream: z
        .object({
          query: QueryWithEsql.right,
        })
        .passthrough(),
    }),
  }
);

// Optimized implementation for Definition check - the fallback is a zod-based check
QueryStream.Definition.is = (
  stream: BaseStream.Model['Definition']
): stream is QueryStream.Definition => 'query' in stream;
