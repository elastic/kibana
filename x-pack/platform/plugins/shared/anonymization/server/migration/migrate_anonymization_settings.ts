/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, IUiSettingsClient } from '@kbn/core/server';
import { ANONYMIZATION_PROFILES_INDEX } from '../../common';

interface LegacyAnonymizationRule {
  type: 'RegExp' | 'NER';
  enabled: boolean;
  pattern?: string;
  entityClass?: string;
  modelId?: string;
  allowedEntityClasses?: string[];
}

interface LegacyAnonymizationSettings {
  rules: LegacyAnonymizationRule[];
}

/**
 * Performs a one-time, idempotent migration of enabled regex/NER rules from
 * the advanced setting `ai:anonymizationSettings` into Anonymization Profiles.
 *
 * Migration semantics:
 * - Only rules with `enabled: true` are migrated
 * - If a profile already has non-empty regex/NER rules, they are NOT overwritten
 * - If a profile has empty/missing regex/NER rules, they are set to the migrated rules
 * - A migration marker is recorded to prevent repeated application
 *
 * @param namespace - The space ID
 * @param esClient - Internal Elasticsearch client
 * @param uiSettings - UI settings client scoped to the space
 * @param logger - Logger instance
 */
export const migrateAnonymizationSettings = async ({
  namespace,
  esClient,
  uiSettings,
  logger,
}: {
  namespace: string;
  esClient: ElasticsearchClient;
  uiSettings: IUiSettingsClient;
  logger: Logger;
}): Promise<void> => {
  try {
    // Read the legacy setting
    let settingsValue: string;
    try {
      settingsValue = await uiSettings.get<string>('ai:anonymizationSettings');
    } catch {
      // Setting doesn't exist or can't be read — nothing to migrate
      logger.debug(`No ai:anonymizationSettings found in space ${namespace}, skipping migration`);
      return;
    }

    if (!settingsValue) {
      return;
    }

    let settings: LegacyAnonymizationSettings;
    try {
      settings = typeof settingsValue === 'string' ? JSON.parse(settingsValue) : settingsValue;
    } catch {
      logger.warn(`Failed to parse ai:anonymizationSettings in space ${namespace}, skipping`);
      return;
    }

    if (!settings.rules || settings.rules.length === 0) {
      return;
    }

    // Filter to enabled rules only
    const enabledRegexRules = settings.rules.filter(
      (r) => r.type === 'RegExp' && r.enabled && r.pattern && r.entityClass
    );
    const enabledNerRules = settings.rules.filter(
      (r) => r.type === 'NER' && r.enabled && r.modelId
    );

    if (enabledRegexRules.length === 0 && enabledNerRules.length === 0) {
      logger.debug(`No enabled rules in ai:anonymizationSettings for space ${namespace}`);
      return;
    }

    // Find all profiles in this space that haven't been migrated yet
    const profilesResult = await esClient.search({
      index: ANONYMIZATION_PROFILES_INDEX,
      body: {
        query: {
          bool: {
            must: [{ term: { namespace } }],
            must_not: [{ exists: { field: 'migration.ai_anonymization_settings.applied_at' } }],
          },
        },
        size: 100,
      },
    });

    if (profilesResult.hits.hits.length === 0) {
      logger.debug(`No unmigrated profiles in space ${namespace}`);
      return;
    }

    const now = new Date().toISOString();

    for (const hit of profilesResult.hits.hits) {
      const doc = hit._source as Record<string, unknown> | undefined;
      if (!doc || !hit._id) {
        continue;
      }

      const existingRules = doc.rules as Record<string, unknown[]> | undefined;
      const hasExistingRegex = (existingRules?.regex_rules?.length ?? 0) > 0;
      const hasExistingNer = (existingRules?.ner_rules?.length ?? 0) > 0;

      const updateBody: Record<string, unknown> = {
        migration: {
          ai_anonymization_settings: {
            applied_at: now,
          },
        },
      };

      // Only set regex rules if profile doesn't already have them
      if (!hasExistingRegex && enabledRegexRules.length > 0) {
        updateBody['rules.regex_rules'] = enabledRegexRules.map((r, i) => ({
          id: `migrated-regex-${i}`,
          type: 'regex',
          entity_class: r.entityClass,
          pattern: r.pattern,
          enabled: true,
        }));
      }

      // Only set NER rules if profile doesn't already have them
      if (!hasExistingNer && enabledNerRules.length > 0) {
        updateBody['rules.ner_rules'] = enabledNerRules.map((r, i) => ({
          id: `migrated-ner-${i}`,
          type: 'ner',
          model_id: r.modelId,
          allowed_entity_classes: r.allowedEntityClasses ?? [],
          enabled: true,
        }));
      }

      await esClient.update({
        index: ANONYMIZATION_PROFILES_INDEX,
        id: hit._id,
        body: { doc: updateBody },
        refresh: 'wait_for',
      });

      logger.info(`Migrated ai:anonymizationSettings to profile ${hit._id} in space ${namespace}`);
    }
  } catch (err) {
    logger.error(
      `Failed to migrate ai:anonymizationSettings in space ${namespace}: ${err.message}`
    );
  }
};
