/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type {
  PersistedSkillCreateRequest,
  PersistedSkillUpdateRequest,
  PublicSkillDefinition,
} from '@kbn/agent-builder-common';

export interface ReadonlySkillProvider {
  id: string;
  readonly: true;
  has(skillId: string): MaybePromise<boolean>;
  get(skillId: string): MaybePromise<SkillDefinition | undefined>;
  list(): MaybePromise<SkillDefinition[]>;
}

export interface WritableSkillProvider
  extends Omit<ReadonlySkillProvider, 'readonly' | 'get' | 'list'> {
  readonly: false;
  get(skillId: string): MaybePromise<PublicSkillDefinition | undefined>;
  list(): MaybePromise<PublicSkillDefinition[]>;
  create(params: PersistedSkillCreateRequest): MaybePromise<PublicSkillDefinition>;
  update(skillId: string, update: PersistedSkillUpdateRequest): MaybePromise<PublicSkillDefinition>;
  delete(skillId: string): MaybePromise<boolean>;
}

export type SkillProviderFn<Readonly extends boolean> = (opts: {
  request: KibanaRequest;
  space: string;
}) => MaybePromise<Readonly extends true ? ReadonlySkillProvider : WritableSkillProvider>;

export type SkillProvider = ReadonlySkillProvider | WritableSkillProvider;

export const isReadonlySkillProvider = (
  provider: SkillProvider
): provider is ReadonlySkillProvider => {
  return provider.readonly;
};

export const isWritableSkillProvider = (
  provider: SkillProvider
): provider is WritableSkillProvider => {
  return !provider.readonly;
};
