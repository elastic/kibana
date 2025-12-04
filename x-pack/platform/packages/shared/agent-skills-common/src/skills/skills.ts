/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type { ToolHandlerContext } from '@kbn/onechat-server';
import type { KibanaRequest } from '@kbn/core-http-server';

export interface SkillFile {
  id: string;
  name: string;
  shortDescription: string;
  content: string;
  filePath: string;
}

export interface SkillTool<TInputSchema extends z.ZodObject<any, any, any, any, any> = z.ZodObject<any, any, any, any, any>> {
    /**
   * Unique identifier for the skill (e.g., "observability.get_alerts")
   */
    id: string;
    /**
     * Human-readable name of the skill
     */
    name: string;
    /**
     * Short description of what the skill does
     */
    shortDescription: string;
  
    /**
     * Full description of what the skill does
     */
    fullDescription: string;
    /**
     * Optional category for grouping skills
     */
    categories?: string[];
    /**
     * Zod schema for validating input parameters
     */
    inputSchema?: TInputSchema;
    /**
     * Handler function that executes the skill
     */
    handler: (params: z.infer<TInputSchema>, context: ToolHandlerContext | { request: KibanaRequest }) => Promise<any>;
    /**
     * Optional examples of how to use this skill
     */
    examples?: string[];
}

export abstract class Skill {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly shortDescription: string;
  abstract readonly files: SkillFile[];
  abstract readonly tools: SkillTool[];
}
