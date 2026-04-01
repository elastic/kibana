/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, IUiSettingsClient } from '@kbn/core/server';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS,
} from '@kbn/management-settings-ids';
import {
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
} from './model_settings_config';
import type { ModelSettingsConfigAttributes } from './model_settings_config';

interface ContinuousKiExtractionSettings {
  enabled?: boolean;
  intervalHours?: number;
  excludedStreamPatterns?: string;
}

export interface ModelSettings extends ModelSettingsConfigAttributes {
  continuousKiExtraction?: ContinuousKiExtractionSettings;
}

export interface ModelSettingsConfigClient {
  getSettings(): Promise<ModelSettings>;
  updateSettings(settings: Partial<ModelSettings>): Promise<void>;
}

export class ModelSettingsConfigClientImpl implements ModelSettingsConfigClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly globalUiSettingsClient: IUiSettingsClient,
    private readonly logger: Logger
  ) {}

  async getSettings(): Promise<ModelSettings> {
    const [soSettings, ceSettings] = await Promise.all([
      this.getSOSettings(),
      this.getContinuousKiExtractionSettings(),
    ]);

    return {
      ...soSettings,
      continuousKiExtraction: ceSettings,
    };
  }

  async updateSettings(settings: Partial<ModelSettings>): Promise<void> {
    const { continuousKiExtraction, ...soFields } = settings;

    const soEntries: Array<[keyof ModelSettingsConfigAttributes, string]> = [];
    for (const [key, value] of Object.entries(soFields)) {
      if (value !== undefined) {
        soEntries.push([key as keyof ModelSettingsConfigAttributes, value]);
      }
    }

    const promises: Promise<void>[] = [];

    if (soEntries.length > 0) {
      const soUpdate: Partial<ModelSettingsConfigAttributes> = Object.fromEntries(soEntries);
      promises.push(this.updateSOSettings(soUpdate));
    }

    if (continuousKiExtraction) {
      promises.push(this.updateContinuousKiExtractionSettings(continuousKiExtraction));
    }

    await Promise.all(promises);
  }

  private async getSOSettings(): Promise<Omit<ModelSettings, 'continuousKiExtraction'>> {
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
        indexPatterns: undefined,
      };
    }

    const toOptional = (v: string | undefined) => (v != null && v.trim() !== '' ? v : undefined);
    return {
      connectorIdKnowledgeIndicatorExtraction: toOptional(
        attributes.connectorIdKnowledgeIndicatorExtraction
      ),
      connectorIdRuleGeneration: toOptional(attributes.connectorIdRuleGeneration),
      connectorIdDiscovery: toOptional(attributes.connectorIdDiscovery),
      indexPatterns: toOptional(attributes.indexPatterns),
    };
  }

  private async getContinuousKiExtractionSettings(): Promise<ContinuousKiExtractionSettings> {
    const [enabled, intervalHours, excludedStreamPatterns] = await Promise.all([
      this.globalUiSettingsClient.get<boolean>(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED
      ),
      this.globalUiSettingsClient.get<number>(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS
      ),
      this.globalUiSettingsClient.get<string>(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS
      ),
    ]);

    return {
      enabled,
      intervalHours,
      excludedStreamPatterns,
    };
  }

  private async updateSOSettings(soFields: Partial<ModelSettingsConfigAttributes>): Promise<void> {
    const currentSO = await this.getSOSettings();
    const merged = { ...currentSO, ...soFields };
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

  private async updateContinuousKiExtractionSettings(
    ce: Partial<ContinuousKiExtractionSettings>
  ): Promise<void> {
    const updates: Record<string, boolean | number | string> = {};

    if (ce.enabled !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED] = ce.enabled;
    }
    if (ce.intervalHours !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS] = ce.intervalHours;
    }
    if (ce.excludedStreamPatterns !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS] =
        ce.excludedStreamPatterns;
    }

    if (Object.keys(updates).length > 0) {
      await this.globalUiSettingsClient.setMany(updates);
    }
  }
}
