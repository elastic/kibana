/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
} from './model_settings_config';
import type { ModelSettingsConfigAttributes } from './model_settings_config';

/**
 * Raw model settings as stored or returned by the API.
 * Each property is undefined when no saved object exists or the value was never set.
 */
export interface ModelSettings {
  connectorIdKnowledgeIndicatorExtraction?: string;
  connectorIdRuleGeneration?: string;
  connectorIdDiscovery?: string;
}

export interface ModelSettingsConfigClient {
  getSettings(): Promise<ModelSettings>;
  updateSettings(settings: Partial<ModelSettingsConfigAttributes>): Promise<void>;
}

export class ModelSettingsConfigClientImpl implements ModelSettingsConfigClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  async getSettings(): Promise<ModelSettings> {
    let attributes: ModelSettingsConfigAttributes | null = null;
    try {
      const data = await this.soClient.get<ModelSettingsConfigAttributes>(
        STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
        STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID
      );
      attributes = data.attributes;
    } catch (err) {
      if (
        (err as { output?: { statusCode?: number } })?.output?.statusCode === 404 ||
        (err as { statusCode?: number })?.statusCode === 404
      ) {
        this.logger.debug(
          `No saved settings found for ${STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID}`
        );
      } else {
        throw err;
      }
    }

    if (!attributes) {
      return {
        connectorIdKnowledgeIndicatorExtraction: undefined,
        connectorIdRuleGeneration: undefined,
        connectorIdDiscovery: undefined,
      };
    }

    const toOptional = (v: string | undefined) => (v != null && v.trim() !== '' ? v : undefined);
    return {
      connectorIdKnowledgeIndicatorExtraction: toOptional(
        attributes.connectorIdKnowledgeIndicatorExtraction
      ),
      connectorIdRuleGeneration: toOptional(attributes.connectorIdRuleGeneration),
      connectorIdDiscovery: toOptional(attributes.connectorIdDiscovery),
    };
  }

  async updateSettings(settings: Partial<ModelSettingsConfigAttributes>): Promise<void> {
    const current = await this.getSettings();
    const updates = Object.fromEntries(
      Object.entries(settings).filter(([, v]) => v !== undefined)
    ) as Partial<ModelSettingsConfigAttributes>;
    const merged: ModelSettings = { ...current, ...updates };
    const toWrite = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined)
    ) as ModelSettingsConfigAttributes;

    await this.soClient.create<ModelSettingsConfigAttributes>(
      STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
      toWrite,
      {
        id: STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
        overwrite: true,
      }
    );
  }
}
