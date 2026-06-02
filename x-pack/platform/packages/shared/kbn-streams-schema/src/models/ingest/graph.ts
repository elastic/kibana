/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { IngestBaseStream } from './base';
import {
  IngestBase,
  IngestBaseUpsertRequest,
  ingestBaseSchemaFields,
  ingestBaseUpsertSchemaFields,
  ingestBaseStreamDefinitionSchema,
  ingestBaseStreamGetResponseSchema,
  ingestBaseStreamUpsertDefinitionSchema,
  ingestBaseStreamUpsertRequestSchema,
} from './base';
import type { RoutingDefinition } from './routing';
import { routingDefinitionListSchema } from './routing';
import type { FieldDefinition } from '../../fields';
import { fieldDefinitionSchema } from '../../fields';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import type { BaseStream } from '../base';

/* eslint-disable @typescript-eslint/no-namespace */

interface IngestGraph {
  graph: {
    fields: FieldDefinition;
    routing: RoutingDefinition[];
  };
}

const ingestGraphShape = {
  graph: z.object({
    fields: fieldDefinitionSchema,
    routing: routingDefinitionListSchema,
  }),
};

export type GraphIngest = IngestBase & IngestGraph;

const graphIngestSchemaObject = z.object({
  ...ingestBaseSchemaFields,
  ...ingestGraphShape,
});

export const GraphIngest: Validation<IngestBase, GraphIngest> = validation(
  IngestBase.right,
  graphIngestSchemaObject
);

export type GraphIngestUpsertRequest = IngestBaseUpsertRequest & IngestGraph;

const graphIngestUpsertSchemaObject = z.object({
  ...ingestBaseUpsertSchemaFields,
  ...ingestGraphShape,
});

export const GraphIngestUpsertRequest: Validation<
  IngestBaseUpsertRequest,
  GraphIngestUpsertRequest
> = validation(IngestBaseUpsertRequest.right, graphIngestUpsertSchemaObject);

export namespace GraphStream {
  export interface Model {
    Definition: GraphStream.Definition;
    Source: GraphStream.Source;
    GetResponse: GraphStream.GetResponse;
    UpsertRequest: GraphStream.UpsertRequest;
  }

  export interface Definition extends IngestBaseStream.Definition {
    type: 'graph';
    ingest: GraphIngest;
  }

  export type Source = IngestBaseStream.Source<GraphStream.Definition>;

  export interface GetResponse extends IngestBaseStream.GetResponse<Definition> {
    /**
     * Whether the backing data stream exists in Elasticsearch.
     */
    data_stream_exists: boolean;
  }

  export type UpsertRequest = IngestBaseStream.UpsertRequest<
    Omit<Definition, 'ingest'> & {
      ingest: Omit<GraphIngest, 'processing'> & {
        processing: Omit<GraphIngest['processing'], 'updated_at'> & { updated_at?: never };
      };
    }
  >;
}

const graphStreamDefinitionSchema = ingestBaseStreamDefinitionSchema
  .extend({
    type: z.literal('graph'),
    ingest: graphIngestSchemaObject,
  })
  .meta({ id: 'GraphStreamDefinition' });

const graphStreamGetResponseSchema = ingestBaseStreamGetResponseSchema
  .extend({
    stream: graphStreamDefinitionSchema,
    data_stream_exists: z.boolean(),
  })
  .meta({ id: 'GraphStreamGetResponse' });

const graphStreamUpsertRequestSchema = ingestBaseStreamUpsertRequestSchema
  .extend({
    stream: ingestBaseStreamUpsertDefinitionSchema.extend({
      type: z.literal('graph'),
      ingest: graphIngestUpsertSchemaObject,
    }),
  })
  .meta({ id: 'GraphStreamUpsertRequest' });

export const GraphStream: {
  Definition: Validation<BaseStream.Model['Definition'], GraphStream.Definition>;
  Source: Validation<BaseStream.Model['Definition'], GraphStream.Source>;
  GetResponse: Validation<BaseStream.Model['GetResponse'], GraphStream.GetResponse>;
  UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], GraphStream.UpsertRequest>;
} = {
  Definition: validation(
    graphStreamDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
    graphStreamDefinitionSchema
  ),
  Source: validation(
    graphStreamDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
    graphStreamDefinitionSchema
  ),
  GetResponse: validation(
    graphStreamGetResponseSchema as z.Schema<BaseStream.Model['GetResponse']>,
    graphStreamGetResponseSchema
  ),
  UpsertRequest: validation(
    graphStreamUpsertRequestSchema as z.Schema<BaseStream.Model['UpsertRequest']>,
    graphStreamUpsertRequestSchema
  ),
};

// Optimized implementation for Definition check
GraphStream.Definition.is = (
  stream: BaseStream.Model['Definition']
): stream is GraphStream.Definition =>
  Boolean(
    'ingest' in stream &&
      typeof stream.ingest === 'object' &&
      stream.ingest &&
      'graph' in stream.ingest
  );

// Optimized implementation for GetResponse check
GraphStream.GetResponse.is = (
  response: BaseStream.Model['GetResponse']
): response is GraphStream.GetResponse =>
  GraphStream.Definition.is(response.stream) &&
  'privileges' in response &&
  typeof response.privileges === 'object' &&
  response.privileges !== null;
