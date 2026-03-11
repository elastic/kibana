/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type {
  PersistedSkillCreateRequest,
  PersistedSkillUpdateRequest,
} from '@kbn/agent-builder-common';

export interface ReadonlySkillProvider {
  id: string;
  readonly: true;
  has(skillId: string): MaybePromise<boolean>;
  get(skillId: string): MaybePromise<InternalSkillDefinition | undefined>;
  list(): MaybePromise<InternalSkillDefinition[]>;
}

export interface WritableSkillProvider extends Omit<ReadonlySkillProvider, 'readonly'> {
  readonly: false;
  create(params: PersistedSkillCreateRequest): MaybePromise<InternalSkillDefinition>;
  update(
    skillId: string,
    update: PersistedSkillUpdateRequest
  ): MaybePromise<InternalSkillDefinition>;
  /** Deletes a skill. Throws if the skill does not exist or is read-only. */
  delete(skillId: string): MaybePromise<void>;
}

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
