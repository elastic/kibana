/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

/**
 * Configuration for registering a custom rendering element.
 * The prompt, description, and standard attributes will be auto-generated.
 */
export interface CustomElementConfig {
  /** The HTML tag name for this element (e.g., 'visualization') */
  tagName: string;
  /** The tool result type this element renders (e.g., ToolResultType.tabularData) */
  toolResultType: ToolResultType;
  /**
   * Optional: Additional custom attributes beyond the standard 'tool-result-id'.
   * Format: { propName: 'html-attribute-name' }
   */
  additionalAttributes?: Record<string, string>;
}

/**
 * Public interface for the element registry
 */
export interface ElementRegistry {
  /**
   * Register a custom element. All prompts and instructions will be auto-generated.
   */
  register(config: CustomElementConfig): void;

  /**
   * Generate combined AI instructions for all registered elements
   */
  generateAIInstructions(): string;
}

