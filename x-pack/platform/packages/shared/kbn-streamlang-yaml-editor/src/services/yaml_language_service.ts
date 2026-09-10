/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type MonacoYaml, type MonacoYamlOptions } from 'monaco-yaml';
import { configureMonacoYamlSchema } from '@kbn/monaco';

// Default options for Monaco YAML
const defaultMonacoYamlOptions: MonacoYamlOptions = {
  completion: true, // Enable schema-based completions
  hover: false, // Hover is handled by custom providers
  validate: true, // Keep validation enabled
};

let instance: MonacoYaml | null = null;
let initPromise: Promise<MonacoYaml> | null = null;
let refCount = 0;

/**
 * Service to manage the global monaco-yaml instance for Streamlang.
 * monaco-yaml only supports a single global instance, so we manage it as a singleton.
 * Uses reference counting to support multiple editors on the same page.
 * See: https://github.com/remcohaszing/monaco-yaml#usage
 * NOTE: Both the Streamlang and Workflows editors use this apporach. If we ever require both editors to work
 * on the same page simultaneously, this service should be refactored. This would involve hoisting schema awareness
 * for both editors all the way up to the kbn-monaco package, so they're registered in a single configuration call.
 */
export const yamlLanguageService = {
  /**
   * Initialize the monaco-yaml instance with the given schemas and options.
   * If already initialized, returns the existing instance.
   */
  async initialize(
    schemas: MonacoYamlOptions['schemas'] = [],
    options: Partial<MonacoYamlOptions> = {}
  ): Promise<MonacoYaml> {
    if (!initPromise) {
      initPromise = configureMonacoYamlSchema(schemas, {
        ...defaultMonacoYamlOptions,
        ...options,
      }).then((monacoYaml) => {
        instance = monacoYaml;
        return monacoYaml;
      });
    }
    return initPromise;
  },

  /**
   * Register an editor and update schemas.
   * Increments the reference count and updates the monaco-yaml instance.
   * Call `release()` when the editor unmounts.
   */
  async register(
    schemas: MonacoYamlOptions['schemas'] = [],
    options: Partial<MonacoYamlOptions> = {}
  ): Promise<void> {
    refCount++;

    if (instance) {
      await instance.update({
        ...defaultMonacoYamlOptions,
        ...options,
        schemas,
      });
    } else {
      await this.initialize(schemas, options);
    }
  },

  /**
   * Release an editor registration.
   * Decrements the reference count and clears schemas only when the last editor unmounts.
   * This allows multiple editors to share the same schemas on the same page.
   */
  async release(): Promise<void> {
    refCount = Math.max(0, refCount - 1);

    if (refCount === 0) {
      await this.clearSchemas();
    }
  },

  /**
   * Update the monaco-yaml instance with new schemas and options.
   * If not initialized, initializes it first.
   * Note: Prefer using `register()` and `release()` for proper reference counting.
   */
  async update(
    schemas: MonacoYamlOptions['schemas'] = [],
    options: Partial<MonacoYamlOptions> = {}
  ): Promise<void> {
    if (instance) {
      await instance.update({
        ...defaultMonacoYamlOptions,
        ...options,
        schemas,
      });
    } else {
      await this.initialize(schemas, options);
    }
  },

  /**
   * Clear schemas from the monaco-yaml instance.
   * Keeps the instance alive but removes all schemas.
   */
  async clearSchemas(): Promise<void> {
    if (instance) {
      await instance.update({
        ...defaultMonacoYamlOptions,
        schemas: [],
      });
    }
  },

  /**
   * Dispose of the monaco-yaml instance completely.
   * Should only be called when no YamlEditor components are mounted.
   */
  dispose(): void {
    if (instance) {
      instance.dispose();
      instance = null;
      initPromise = null;
      refCount = 0;
    }
  },

  /**
   * Get the current monaco-yaml instance.
   * Returns null if not initialized.
   */
  getInstance(): MonacoYaml | null {
    return instance;
  },

  /**
   * Check if the service is initialized.
   */
  isInitialized(): boolean {
    return instance !== null;
  },

  /**
   * Get the current reference count (for debugging/testing).
   */
  getRefCount(): number {
    return refCount;
  },
};
