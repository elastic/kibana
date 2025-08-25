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

export type GroupStreamRelationshipType = 'related' | 'child' | 'parent' | 'dependency';

interface StreamRelationship {
  name: string;
  type: GroupStreamRelationshipType;
}

const streamRelationshipSchema = z.object({
  name: z.string(),
  type: z.union([
    z.literal('related'),
    z.literal('child'),
    z.literal('parent'),
    z.literal('dependency'),
  ]),
});

export interface Group {
  owner: string;
  tier: 1 | 2 | 3 | 4;
  metadata: Record<string, string>;
  tags: string[];
  runbook_links: string[];
  documentation_links: string[];
  repository_links: string[];
  relationships: StreamRelationship[];
}

export const Group: Validation<unknown, Group> = validation(
  z.unknown(),
  z.object({
    owner: z.string(),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    metadata: z.record(z.string()),
    tags: z.array(z.string()),
    runbook_links: z.array(z.string()),
    documentation_links: z.array(z.string()),
    repository_links: z.array(z.string()),
    relationships: z.array(streamRelationshipSchema),
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

// Optimized implementation for Definition check - the fallback is a zod-based check
GroupStream.Definition.is = (
  stream: BaseStream.Model['Definition']
): stream is GroupStream.Definition => 'group' in stream;
