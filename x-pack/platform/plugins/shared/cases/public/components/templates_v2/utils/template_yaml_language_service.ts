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
  completion: true,
  hover: true,
  validate: true,
};

let instance: MonacoYaml | null = null;
let initPromise: Promise<MonacoYaml> | null = null;

/**
 * Service to manage the global monaco-yaml instance for template YAML editing.
 * monaco-yaml only supports a single global instance, so we manage it as a singleton.
 * Based on workflows' yaml_language_service.ts
 */
export const templateYamlLanguageService = {
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
   * Update the monaco-yaml instance with new schemas and options.
   * If not initialized, initializes it first.
   */
  async update(
    schemas: MonacoYamlOptions['schemas'] = [],
    options: Partial<MonacoYamlOptions> = {}
  ): Promise<void> {
    if (instance) {
      instance.update({
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
   * Should only be called when no TemplateYamlEditor components are mounted.
   */
  dispose(): void {
    if (instance) {
      instance.dispose();
      instance = null;
      initPromise = null;
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
};
