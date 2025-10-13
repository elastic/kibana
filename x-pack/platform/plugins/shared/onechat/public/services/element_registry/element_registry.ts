/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CustomElementConfig, MarkdownParser, RendererFactory } from './types';
import { createElementParser } from './create_element_parser';

/**
 * Registry for custom markdown elements
 */
export class ElementRegistry {
  private readonly elements = new Map<string, CustomElementConfig>();
  private readonly parsers = new Map<string, MarkdownParser>();
  private readonly logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Register a custom element
   * @param config - Element configuration
   * @throws Error if tag name is invalid or already registered
   */
  register(config: CustomElementConfig): void {
    const { tagName } = config;

    // Validate tag name format (kebab-case)
    if (!this.isValidTagName(tagName)) {
      const error = `Invalid tag name: "${tagName}". Tag names must be kebab-case (lowercase letters, numbers, and hyphens).`;
      this.logger?.error(error);
      throw new Error(error);
    }

    // Check for conflicts
    if (this.elements.has(tagName)) {
      const warning = `Element with tag name "${tagName}" is already registered. Overwriting previous registration.`;
      this.logger?.warn(warning);
    }

    // Validate attribute names
    for (const attrName of Object.values(config.attributes)) {
      if (!this.isValidAttributeName(attrName)) {
        const error = `Invalid attribute name: "${attrName}". Attribute names must be valid HTML attributes.`;
        this.logger?.error(error);
        throw new Error(error);
      }
    }

    // Store the element config
    this.elements.set(tagName, config);

    // Generate and store the parser
    const parser = createElementParser(config);
    this.parsers.set(tagName, parser);

    this.logger?.debug(`Registered custom element: ${tagName}`);
  }

  /**
   * Get parser for a specific tag name
   */
  getParser(tagName: string): MarkdownParser | undefined {
    return this.parsers.get(tagName);
  }

  /**
   * Get all registered parsers
   */
  getAllParsers(): MarkdownParser[] {
    return Array.from(this.parsers.values());
  }

  /**
   * Get renderer factory for a specific tag name
   */
  getRenderer(tagName: string): RendererFactory | undefined {
    return this.elements.get(tagName)?.rendererFactory;
  }

  /**
   * Get all registered renderers as a tag name -> renderer factory map
   */
  getAllRenderers(): Record<string, RendererFactory> {
    const renderers: Record<string, RendererFactory> = {};
    for (const [tagName, config] of this.elements.entries()) {
      renderers[tagName] = config.rendererFactory;
    }
    return renderers;
  }

  /**
   * Check if an element is registered
   */
  has(tagName: string): boolean {
    return this.elements.has(tagName);
  }

  /**
   * Get all registered tag names
   */
  getTagNames(): string[] {
    return Array.from(this.elements.keys());
  }

  /**
   * Validate tag name format (kebab-case)
   */
  private isValidTagName(tagName: string): boolean {
    // Must be lowercase letters, numbers, and hyphens, starting with a letter
    return /^[a-z][a-z0-9-]*$/.test(tagName);
  }

  /**
   * Validate attribute name format
   */
  private isValidAttributeName(attrName: string): boolean {
    // Must be valid HTML attribute name (letters, numbers, hyphens)
    return /^[a-z][a-z0-9-]*$/.test(attrName);
  }
}

