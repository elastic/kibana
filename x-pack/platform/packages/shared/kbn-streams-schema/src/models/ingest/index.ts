/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { BaseStream } from '../base';
import { IngestBase } from './base';
import { ModelValidation, joinValidation } from '../validation/model_validation';
import { Validation, validation } from '../validation/validation';
import { UnwiredIngest, UnwiredStream } from './unwired';
import { WiredIngest, WiredStream } from './wired';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace IngestStream {
  export namespace all {
    export type UpsertRequest = WiredStream.UpsertRequest | UnwiredStream.UpsertRequest;

    export type Source = WiredStream.Source | UnwiredStream.Source;
    export type Definition = WiredStream.Definition | UnwiredStream.Definition;
    export type GetResponse = WiredStream.GetResponse | UnwiredStream.GetResponse;

    export type Model = WiredStream.Model | UnwiredStream.Model;
  }

  export const all: ModelValidation<BaseStream.Model, IngestStream.all.Model> = joinValidation(
    BaseStream,
    [WiredStream, UnwiredStream]
  );
}

export type Ingest = WiredIngest | UnwiredIngest;
export const Ingest: Validation<IngestBase, Ingest> = validation(
  IngestBase.right,
  z.union([WiredIngest.right, UnwiredIngest.right])
);
