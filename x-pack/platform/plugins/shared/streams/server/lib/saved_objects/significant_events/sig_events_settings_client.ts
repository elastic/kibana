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
} from './sig_events_settings_config';
import type { SigEventsSettingsAttributes } from './sig_events_settings_config';

/**
 * SigEvents skill state persisted in the significant events settings saved object.
 */
export interface SigEventsSkillSettings {
  enabled: boolean;
  content?: string;
  toolIds?: string[];
}

/**
 * SigEvents settings as stored or returned by the API.
 * Each property is undefined when no saved object exists or the value was never set.
 */
export interface SigEventsSettings {
  connectorIdKnowledgeIndicatorExtraction?: string;
  connectorIdRuleGeneration?: string;
  connectorIdDiscovery?: string;
  sigEventsSkill?: SigEventsSkillSettings;
}

export interface SigEventsSettingsClient {
  getSettings(): Promise<SigEventsSettings>;
  updateSettings(settings: Partial<SigEventsSettingsAttributes>): Promise<void>;
}

export class SigEventsSettingsClientImpl implements SigEventsSettingsClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  async getSettings(): Promise<SigEventsSettings> {
    let attributes: SigEventsSettingsAttributes | null = null;
    try {
      const data = await this.soClient.get<SigEventsSettingsAttributes>(
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
        sigEventsSkill: undefined,
      };
    }

    const toOptional = (v: string | undefined) => (v != null && v.trim() !== '' ? v : undefined);
    const sigEventsSkill = attributes.sigEventsSkill
      ? {
          enabled: attributes.sigEventsSkill.enabled,
          content: toOptional(attributes.sigEventsSkill.content),
          toolIds: attributes.sigEventsSkill.toolIds,
        }
      : undefined;

    return {
      connectorIdKnowledgeIndicatorExtraction: toOptional(
        attributes.connectorIdKnowledgeIndicatorExtraction
      ),
      connectorIdRuleGeneration: toOptional(attributes.connectorIdRuleGeneration),
      connectorIdDiscovery: toOptional(attributes.connectorIdDiscovery),
      sigEventsSkill,
    };
  }

  async updateSettings(settings: Partial<SigEventsSettingsAttributes>): Promise<void> {
    const current = await this.getSettings();
    const updates = Object.fromEntries(
      Object.entries(settings).filter(([, v]) => v !== undefined)
    ) as Partial<SigEventsSettingsAttributes>;

    const mergedSigEventsSkill =
      updates.sigEventsSkill !== undefined
        ? { ...current.sigEventsSkill, ...updates.sigEventsSkill }
        : current.sigEventsSkill;

    const merged: SigEventsSettings = {
      ...current,
      ...updates,
      sigEventsSkill: mergedSigEventsSkill,
    };
    const toWrite = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined)
    ) as SigEventsSettingsAttributes;

    await this.soClient.create<SigEventsSettingsAttributes>(
      STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
      toWrite,
      {
        id: STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
        overwrite: true,
      }
    );
  }
}
