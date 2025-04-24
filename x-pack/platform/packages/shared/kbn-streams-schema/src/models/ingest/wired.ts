/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { IngestBase, ingestBase } from './base';
import { RoutingDefinition, routingDefinitionSchema } from './routing';
import { base } from '../base';
import {
  WiredIngestStreamEffectiveLifecycle,
  wiredIngestStreamEffectiveLifecycleSchema,
} from './lifecycle';
import { OmitName } from '../core';
import {
  FieldDefinition,
  InheritedFieldDefinition,
  fieldDefinitionSchema,
  inheritedFieldDefinitionSchema,
} from '../../fields';
import { Validation, validation } from '../validation/validation';
import { ModelValidation, modelValidation } from '../validation/model_validation';

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
    routing: z.array(routingDefinitionSchema),
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

  export interface Definition extends ingestBase.Definition {
    ingest: WiredIngest;
  }

  export interface Source extends base.Source, WiredStream.Definition {}

  export interface GetResponse extends ingestBase.GetResponse {
    stream: Definition;
    inherited_fields: InheritedFieldDefinition;
    effective_lifecycle: WiredIngestStreamEffectiveLifecycle;
  }

  export interface UpsertRequest extends ingestBase.UpsertRequest {
    stream: OmitName<Definition>;
  }
}

export const WiredStream: ModelValidation<base.Model, WiredStream.Model> = modelValidation(base, {
  Definition: z.intersection(
    ingestBase.Definition.right,
    z.object({
      ingest: IngestWired,
    })
  ),
  Source: z.intersection(ingestBase.Definition.right, z.object({})),
  GetResponse: z.intersection(
    ingestBase.GetResponse.right,
    z.object({
      inherited_fields: inheritedFieldDefinitionSchema,
      effective_lifecycle: wiredIngestStreamEffectiveLifecycleSchema,
    })
  ),
  UpsertRequest: z.intersection(ingestBase.UpsertRequest.right, z.object({})),
});
