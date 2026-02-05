/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '../skills';

/**
 * Store to access skills during execution
 */
export interface SkillsStore {
  has(skillId: string): boolean;
  get(resultId: string): SkillDefinition;
}

/**
 * Writable version of SkillsStore, used internally by the runner/agent
 */
export interface WritableSkillsStore extends SkillsStore {
  add(result: SkillDefinition): void;
  delete(skillId: string): boolean;
  asReadonly(): SkillsStore;
}
