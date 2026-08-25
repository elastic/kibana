/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AiIndexProperties } from '../common/http_api/ai_indices';

export type AiIndexRegistrationProperties = Omit<AiIndexProperties, 'name'> & { name?: string };

export interface AiIndexRegistration {
  id: string;
  properties: AiIndexRegistrationProperties;
}

export interface ContextEnginePluginSetup {
  /**
   * Registers an AI index with the Context Engine. Registrations queued during setup
   * are persisted (upserted) once the plugin has started and Elasticsearch is available.
   */
  registerAiIndex(id: string, properties: AiIndexRegistrationProperties): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginStart {}

export interface ContextEngineSetupDependencies {
  features: FeaturesPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEngineStartDependencies {}
