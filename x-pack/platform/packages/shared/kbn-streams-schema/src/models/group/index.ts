/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { BaseStream } from '../base';
import { Validation, validation } from '../validation/validation';
import { ModelValidation, modelValidation } from '../validation/model_validation';

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
  export interface Definition extends BaseStream.Definition {
    group: Group;
  }

  export type Source = BaseStream.Source<GroupStream.Definition>;

  export type GetResponse = BaseStream.GetResponse<Definition>;

  export type UpsertRequest = BaseStream.UpsertRequest<Definition>;

  export interface Model {
    Definition: GroupStream.Definition;
    Source: GroupStream.Source;
    GetResponse: GroupStream.GetResponse;
    UpsertRequest: GroupStream.UpsertRequest;
  }
}

export const GroupStream: ModelValidation<BaseStream.Model, GroupStream.Model> = modelValidation(
  BaseStream,
  {
    Source: z.object({}),
    Definition: z.object({
      group: Group.right,
    }),
    GetResponse: z.object({}),
    UpsertRequest: z.object({}),
  }
);
