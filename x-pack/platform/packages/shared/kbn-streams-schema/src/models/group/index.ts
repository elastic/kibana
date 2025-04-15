/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { base } from '../base';
import { ModelValidation, Validation, modelValidation, validation } from '../validation';
import { OmitName } from '../core';

export interface Group {
  members: string[];
}

export const Group: Validation<unknown, Group> = validation(
  z.unknown(),
  z.object({
    members: z.array(z.string()),
  })
);

/* eslint-disable @typescript-eslint/no-namespace */
export namespace GroupStream {
  export interface Definition extends base.Definition {
    group: Group;
  }

  export interface Source extends base.Source, GroupStream.Definition {}

  export interface GetResponse extends base.GetResponse {
    stream: Definition;
  }

  export interface UpsertRequest extends base.UpsertRequest {
    stream: OmitName<Definition>;
  }

  export interface Model {
    Definition: GroupStream.Definition;
    Source: GroupStream.Source;
    GetResponse: GroupStream.GetResponse;
    UpsertRequest: GroupStream.UpsertRequest;
  }
}

export const GroupStream: ModelValidation<base.Model, GroupStream.Model> = modelValidation(base, {
  Source: z.object({}),
  Definition: z.object({
    group: Group.right,
  }),
  GetResponse: z.object({}),
  UpsertRequest: z.object({}),
});
