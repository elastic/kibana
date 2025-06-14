/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { IngestBase, IngestBaseStream } from './base';
import { RoutingDefinition, routingDefinitionListSchema } from './routing';
import {
  WiredIngestStreamEffectiveLifecycle,
  wiredIngestStreamEffectiveLifecycleSchema,
} from './lifecycle';
import {
  FieldDefinition,
  InheritedFieldDefinition,
  fieldDefinitionSchema,
  inheritedFieldDefinitionSchema,
} from '../../fields';
import { Validation, validation } from '../validation/validation';
import { ModelValidation, modelValidation } from '../validation/model_validation';
import { BaseStream } from '../base';

/* eslint-disable @typescript-eslint/no-namespace */

interface IngestWired {
  wired: {
    fields: FieldDefinition;
    routing: RoutingDefinition[];
  };
}

const IngestWired: z.Schema<IngestWired> = z.object({
  wired: z.object({
    fields: fieldDefinitionSchema,
    routing: routingDefinitionListSchema,
  }),
});

export type WiredIngest = IngestBase & IngestWired;

export const WiredIngest: Validation<IngestBase, WiredIngest> = validation(
  IngestBase.right,
  z.intersection(IngestBase.right, IngestWired)
);

export namespace WiredStream {
  export interface Model {
    Definition: WiredStream.Definition;
    Source: WiredStream.Source;
    GetResponse: WiredStream.GetResponse;
    UpsertRequest: WiredStream.UpsertRequest;
  }

  export interface Definition extends IngestBaseStream.Definition {
    ingest: WiredIngest;
  }

  export type Source = IngestBaseStream.Source<WiredStream.Definition>;

  export interface GetResponse extends IngestBaseStream.GetResponse<Definition> {
    inherited_fields: InheritedFieldDefinition;
    effective_lifecycle: WiredIngestStreamEffectiveLifecycle;
  }

  export type UpsertRequest = IngestBaseStream.UpsertRequest<Definition>;
}

export const WiredStream: ModelValidation<BaseStream.Model, WiredStream.Model> = modelValidation(
  BaseStream,
  {
    Definition: z.intersection(
      IngestBaseStream.Definition.right,
      z.object({
        ingest: IngestWired,
      })
    ),
    Source: z.intersection(IngestBaseStream.Definition.right, z.object({})),
    GetResponse: z.intersection(
      IngestBaseStream.GetResponse.right,
      z.object({
        inherited_fields: inheritedFieldDefinitionSchema,
        effective_lifecycle: wiredIngestStreamEffectiveLifecycleSchema,
      })
    ),
    UpsertRequest: z.intersection(IngestBaseStream.UpsertRequest.right, z.object({})),
  }
);
