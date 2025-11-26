/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Simple in-memory skills registry for Solution 2 (Skills Middleware).
 * This provides a basic registry that plugins can use to register skills
 * that will be available through the skills middleware.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolHandlerContext } from './tools';

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category?: string;
  examples?: string[];
  inputSchema?: any;
  handler: (params: any, context: ToolHandlerContext | { request: KibanaRequest }) => Promise<any>;
}

export interface SkillsRegistry {
  get(skillId: string): Promise<SkillDefinition | undefined>;
  list(opts?: { category?: string }): Promise<SkillDefinition[]>;
  search(query: string, category?: string): SkillDefinition[];
}

class SimpleSkillsRegistryImpl implements SkillsRegistry {
  private skills: Map<string, SkillDefinition> = new Map();

  register(skill: SkillDefinition): void {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill with id "${skill.id}" is already registered`);
    }
    this.skills.set(skill.id, skill);
  }

  async get(skillId: string): Promise<SkillDefinition | undefined> {
    return this.skills.get(skillId);
  }

  async list(opts?: { category?: string }): Promise<SkillDefinition[]> {
    let skills = Array.from(this.skills.values());
    if (opts?.category) {
      skills = skills.filter((skill) => skill.category === opts.category);
    }
    return skills;
  }

  search(query: string, category?: string): SkillDefinition[] {
    let skills = Array.from(this.skills.values());

    // Filter by category if provided
    if (category) {
      skills = skills.filter((skill) => skill.category === category);
    }

    // If query is "*" or empty, return all skills (after category filter)
    if (!query || query.trim() === '' || query.trim() === '*') {
      return skills;
    }

    // Search in name, description, and category
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

// Global registry instance
const globalSkillsRegistry = new SimpleSkillsRegistryImpl();

export const getSkillsRegistry = (): SkillsRegistry => {
  return globalSkillsRegistry;
};

export const registerSkill = (skill: SkillDefinition): void => {
  globalSkillsRegistry.register(skill);
};

