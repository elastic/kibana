/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { BaseStream } from '../base';
import { IngestBase } from './base';
import type { ModelValidation } from '../validation/model_validation';
import { joinValidation } from '../validation/model_validation';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import { ClassicIngest, ClassicStream } from './classic';
import { WiredIngest, WiredStream } from './wired';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace IngestStream {
  export namespace all {
    export type UpsertRequest = WiredStream.UpsertRequest | ClassicStream.UpsertRequest;

    export type Source = WiredStream.Source | ClassicStream.Source;
    export type Definition = WiredStream.Definition | ClassicStream.Definition;
    export type GetResponse = WiredStream.GetResponse | ClassicStream.GetResponse;

    export type Model = WiredStream.Model | ClassicStream.Model;
  }

  export const all: ModelValidation<BaseStream.Model, IngestStream.all.Model> = joinValidation(
    BaseStream,
    [
      WiredStream as ModelValidation<BaseStream.Model, WiredStream.Model>,
      ClassicStream as ModelValidation<BaseStream.Model, ClassicStream.Model>,
    ]
  );

  // Optimized implementation for Definition check - the fallback is a zod-based check
  all.Definition.is = (
    stream: BaseStream.Model['Definition']
  ): stream is IngestStream.all.Definition => 'ingest' in stream;
}

export type Ingest = WiredIngest | ClassicIngest;
export const Ingest: Validation<IngestBase, Ingest> = validation(
  IngestBase.right,
  z.union([WiredIngest.right, ClassicIngest.right])
);
