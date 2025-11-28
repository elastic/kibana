/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolHandlerContext } from './tools/handler';

/**
 * Definition of a skill that can be registered and invoked by agents.
 */
export interface SkillDefinition {
  /**
   * Unique identifier for the skill (e.g., "observability.get_alerts")
   */
  id: string;
  /**
   * Human-readable name of the skill
   */
  name: string;
  /**
   * Description of what the skill does
   */
  description: string;
  /**
   * Optional category for grouping skills
   */
  category?: string;
  /**
   * Zod schema for validating input parameters
   */
  inputSchema?: z.ZodObject<any, any, any, any, any>;
  /**
   * Handler function that executes the skill
   */
  handler: (params: any, context: ToolHandlerContext | { request: KibanaRequest }) => Promise<any>;
  /**
   * Optional examples of how to use this skill
   */
  examples?: string[];
}

/**
 * Registry interface for managing skills
 */
export interface SkillsRegistry {
  /**
   * Register a new skill
   */
  register(skill: SkillDefinition): void;
  /**
   * Get a skill by ID
   */
  get(skillId: string): SkillDefinition | undefined;
  /**
   * List all registered skills, optionally filtered by category
   */
  list(opts?: { category?: string }): SkillDefinition[];
  /**
   * Search skills by query string (searches name, description, category, examples)
   */
  search(query: string, category?: string): SkillDefinition[];
}

/**
 * Simple in-memory implementation of SkillsRegistry
 */
class SimpleSkillsRegistryImpl implements SkillsRegistry {
  private skills = new Map<string, SkillDefinition>();

  register(skill: SkillDefinition): void {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill with id "${skill.id}" is already registered`);
    }
    this.skills.set(skill.id, skill);
  }

  get(skillId: string): SkillDefinition | undefined {
    return this.skills.get(skillId);
  }

  list(opts?: { category?: string }): SkillDefinition[] {
    let skills = Array.from(this.skills.values());
    if (opts?.category) {
      skills = skills.filter((skill) => skill.category === opts.category);
    }
    return skills;
  }

  search(query: string, category?: string): SkillDefinition[] {
    let skills = Array.from(this.skills.values());

    if (category) {
      skills = skills.filter((skill) => skill.category === category);
    }

    if (!query || query === '*') {
      return skills; // Return all skills if query is empty or wildcard
    }

    const lowerQuery = query.toLowerCase();
    return skills.filter((skill) => {
      return (
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery) ||
        skill.category?.toLowerCase().includes(lowerQuery) ||
        skill.examples?.some((example) => example.toLowerCase().includes(lowerQuery))
      );
    });
  }
}

// Global singleton instance
let globalRegistry: SkillsRegistry | null = null;

/**
 * Get the global skills registry instance
 */
export function getSkillsRegistry(): SkillsRegistry {
  if (!globalRegistry) {
    globalRegistry = new SimpleSkillsRegistryImpl();
  }
  return globalRegistry;
}

/**
 * Register a skill in the global registry
 */
export function registerSkill(skill: SkillDefinition): void {
  getSkillsRegistry().register(skill);
}

