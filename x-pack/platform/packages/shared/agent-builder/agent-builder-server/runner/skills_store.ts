/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SkillTypeDefinition } from "../skills";

/**
 * Store to access tool results during execution
 */
export interface SkillsStore {
  has(skillId: string): boolean;
  get(resultId: string): SkillTypeDefinition;
}

/**
 * Writable version of ToolResultStore, used internally by the runner/agent
 */
export interface WritableSkillsStore extends SkillsStore {
  add(result: SkillTypeDefinition): void;
  delete(skillId: string): boolean;
  asReadonly(): SkillsStore;
}
