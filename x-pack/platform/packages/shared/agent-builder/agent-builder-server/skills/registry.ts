/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PersistedSkillCreateRequest,
  PersistedSkillUpdateRequest,
} from '@kbn/agent-builder-common';
import type { SkillRegistryListOptions } from '../runner';
import type { InternalSkillDefinition } from './internal';

export interface SkillRegistry {
  has(skillId: string): Promise<boolean>;
  get(skillId: string): Promise<InternalSkillDefinition | undefined>;
  bulkGet(ids: string[]): Promise<Map<string, InternalSkillDefinition>>;
  list(options?: SkillRegistryListOptions): Promise<InternalSkillDefinition[]>;
  create(params: PersistedSkillCreateRequest): Promise<InternalSkillDefinition>;
  update(skillId: string, update: PersistedSkillUpdateRequest): Promise<InternalSkillDefinition>;
  delete(skillId: string): Promise<boolean>;
}
