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
  CONNECTOR_SLOT_NAMES,
} from './model_settings_config';
import type {
  ModelSettingsConfigAttributes,
  ConnectorSlot,
  ConnectorSlotName,
} from './model_settings_config';

/**
 * Raw model settings as stored or returned by the API.
 * Each property is undefined when no saved object exists or the value was never set.
 */
export interface ModelSettings {
  connectorIdKnowledgeIndicatorExtraction?: string;
  connectorIdRuleGeneration?: string;
  connectorIdDiscovery?: string;
  indexPatterns?: string;
}

export interface ConnectorSlotUpdate {
  id: string;
  source: 'user' | 'system';
}

export interface SettingsWithSource {
  connectors: Partial<Record<ConnectorSlotName, ConnectorSlot>>;
}

export interface ModelSettingsConfigClient {
  getSettings(): Promise<ModelSettings>;
  getSettingsWithSource(): Promise<SettingsWithSource>;
  updateSettings(settings: Partial<ModelSettings>): Promise<void>;
  updateSettingsWithSource(updates: {
    connectors?: Partial<Record<ConnectorSlotName, ConnectorSlotUpdate>>;
    indexPatterns?: string;
  }): Promise<void>;
}

const SLOT_TO_FLAT_KEY = {
  kiFeatureExtractionConnector: 'connectorIdKnowledgeIndicatorExtraction',
  kiQueryGenerationConnector: 'connectorIdRuleGeneration',
  discoveryAndSigEventsConnector: 'connectorIdDiscovery',
} as const satisfies Record<ConnectorSlotName, keyof ModelSettings>;

export class ModelSettingsConfigClientImpl implements ModelSettingsConfigClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  private async getRawAttributes(): Promise<ModelSettingsConfigAttributes | null> {
    try {
      const data = await this.soClient.get<ModelSettingsConfigAttributes>(
        STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
        STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID
      );
      return data.attributes;
    } catch (err) {
      if (
        (err as { output?: { statusCode?: number } })?.output?.statusCode === 404 ||
        (err as { statusCode?: number })?.statusCode === 404
      ) {
        this.logger.debug(
          `No saved settings found for ${STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID}`
        );
        return null;
      }
      throw err;
    }
  }

  async getSettings(): Promise<ModelSettings> {
    const attributes = await this.getRawAttributes();

    if (!attributes) {
      return {
        connectorIdKnowledgeIndicatorExtraction: undefined,
        connectorIdRuleGeneration: undefined,
        connectorIdDiscovery: undefined,
        indexPatterns: undefined,
      };
    }

    const result: ModelSettings = {
      indexPatterns: attributes.indexPatterns,
    };

    for (const slotName of CONNECTOR_SLOT_NAMES) {
      const flatKey = SLOT_TO_FLAT_KEY[slotName];
      result[flatKey] = attributes.connectors?.[slotName]?.id;
    }

    return result;
  }

  async getSettingsWithSource(): Promise<SettingsWithSource> {
    const attributes = await this.getRawAttributes();

    if (!attributes?.connectors) {
      return { connectors: {} };
    }

    const connectors: Partial<Record<ConnectorSlotName, ConnectorSlot>> = {};
    for (const slotName of CONNECTOR_SLOT_NAMES) {
      const slot = attributes.connectors[slotName];
      if (slot) {
        connectors[slotName] = slot;
      }
    }

    return { connectors };
  }

  async updateSettings(settings: Partial<ModelSettings>): Promise<void> {
    const connectorUpdates: Partial<Record<ConnectorSlotName, ConnectorSlotUpdate>> = {};

    for (const slotName of CONNECTOR_SLOT_NAMES) {
      const flatKey = SLOT_TO_FLAT_KEY[slotName];
      const value = settings[flatKey];
      if (value !== undefined) {
        connectorUpdates[slotName] = { id: value, source: 'user' };
      }
    }

    await this.updateSettingsWithSource({
      ...(Object.keys(connectorUpdates).length > 0 ? { connectors: connectorUpdates } : {}),
      ...(settings.indexPatterns !== undefined ? { indexPatterns: settings.indexPatterns } : {}),
    });
  }

  async updateSettingsWithSource(updates: {
    connectors?: Partial<Record<ConnectorSlotName, ConnectorSlotUpdate>>;
    indexPatterns?: string;
  }): Promise<void> {
    const attributes = await this.getRawAttributes();

    const mergedConnectors: Record<ConnectorSlotName, ConnectorSlot | undefined> =
      Object.fromEntries(
        CONNECTOR_SLOT_NAMES.map((slotName) => {
          const update = updates.connectors?.[slotName];
          const existing = attributes?.connectors?.[slotName];
          const value: ConnectorSlot | undefined = update
            ? { id: update.id, source: update.source }
            : existing;
          return [slotName, value];
        })
      ) as Record<ConnectorSlotName, ConnectorSlot | undefined>;

    const toWrite: ModelSettingsConfigAttributes = {
      connectors: mergedConnectors,
      indexPatterns: updates.indexPatterns ?? attributes?.indexPatterns,
    };

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
