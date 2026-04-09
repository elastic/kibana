/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonacoYaml, MonacoYamlOptions } from 'monaco-yaml';
import { configureMonacoYamlSchema } from '@kbn/monaco';

const defaultMonacoYamlOptions: MonacoYamlOptions = {
  completion: true,
  hover: true,
  validate: true,
};

let instance: MonacoYaml | null = null;
let initPromise: Promise<MonacoYaml> | null = null;
let refCount = 0;

/**
 * Service to manage the global monaco-yaml instance for the condition editor.
 * Uses reference counting to support multiple editors on the same page.
 *
 * NOTE: This service shares the global monaco-yaml instance with other YAML editors
 * (like the StreamlangYamlEditor). If both editors are used on the same page,
 * they will share the same monaco-yaml instance.
 */
export const conditionYamlService = {
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

  async release(): Promise<void> {
    refCount = Math.max(0, refCount - 1);

    if (refCount === 0) {
      await this.clearSchemas();
    }
  },

  async clearSchemas(): Promise<void> {
    if (instance) {
      await instance.update({
        ...defaultMonacoYamlOptions,
        schemas: [],
      });
    }
  },

  dispose(): void {
    if (instance) {
      instance.dispose();
      instance = null;
      initPromise = null;
      refCount = 0;
    }
  },

  getInstance(): MonacoYaml | null {
    return instance;
  },

  isInitialized(): boolean {
    return instance !== null;
  },

  getRefCount(): number {
    return refCount;
  },
};
