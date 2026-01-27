/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Skill } from '@kbn/agent-builder-common';

/**
 * Common interface shared across all skill providers.
 */
export interface SkillProvider {
  /**
   * Check if a skill is available in the provider
   */
  has(options: SkillProviderHasOptions): Promise<boolean>;
  /**
   * Retrieve a skill based on its identifier.
   * If not found, will throw an error.
   */
  get(options: SkillProviderGetOptions): Promise<Skill>;
  /**
   * List all skills based on the provided filters
   */
  list(options: SkillProviderListOptions): Promise<Skill[]>;
}

/**
 * Options for {@link SkillProvider.has}
 */
export interface SkillProviderHasOptions {
  skillId: string;
  request: KibanaRequest;
}

/**
 * Options for {@link SkillProvider.get}
 */
export interface SkillProviderGetOptions {
  skillId: string;
  request: KibanaRequest;
}

/**
 * Options for {@link SkillProvider.list}
 */
export interface SkillProviderListOptions {
  request: KibanaRequest;
}

