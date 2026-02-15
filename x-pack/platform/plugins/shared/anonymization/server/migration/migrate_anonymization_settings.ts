/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { ANONYMIZATION_PROFILES_INDEX } from '../../common';

interface LegacyRule {
  type: 'RegExp' | 'NER';
  enabled: boolean;
  pattern?: string;
  entityClass?: string;
  modelId?: string;
  allowedEntityClasses?: string[];
}

interface LegacySettings {
  rules: LegacyRule[];
}

const isEnabledRegexRule = (
  rule: LegacyRule
): rule is LegacyRule & { type: 'RegExp'; enabled: true; pattern: string; entityClass: string } =>
  rule.type === 'RegExp' &&
  rule.enabled &&
  typeof rule.pattern === 'string' &&
  rule.pattern.length > 0 &&
  typeof rule.entityClass === 'string' &&
  rule.entityClass.length > 0;

const isEnabledNerRule = (
  rule: LegacyRule
): rule is LegacyRule & { type: 'NER'; enabled: true; modelId: string } =>
  rule.type === 'NER' &&
  rule.enabled &&
  typeof rule.modelId === 'string' &&
  rule.modelId.length > 0;

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
    let settingsRaw: string;
    try {
      settingsRaw = await uiSettings.get<string>('ai:anonymizationSettings');
    } catch {
      logger.debug(`No ai:anonymizationSettings found in space ${namespace}, skipping migration`);
      return;
    }

    if (!settingsRaw) {
      return;
    }

    let settings: LegacySettings;
    try {
      settings = JSON.parse(settingsRaw) as LegacySettings;
    } catch {
      logger.warn(`Failed to parse ai:anonymizationSettings in space ${namespace}, skipping`);
      return;
    }

    const regexRules = settings.rules?.filter(isEnabledRegexRule) ?? [];
    const nerRules = settings.rules?.filter(isEnabledNerRule) ?? [];

    if (regexRules.length === 0 && nerRules.length === 0) {
      return;
    }

    let searchAfter: FieldValue[] | undefined;

    while (true) {
      const result = await esClient.search<Record<string, unknown>>({
        index: ANONYMIZATION_PROFILES_INDEX,
        query: {
          bool: {
            must: [{ term: { namespace } }],
            must_not: [{ exists: { field: 'migration.ai_anonymization_settings.applied_at' } }],
          },
        },
        sort: [{ created_at: { order: 'asc' } }, { id: { order: 'asc' } }],
        search_after: searchAfter,
        size: 100,
      });

      const hits = result.hits.hits;
      if (hits.length === 0) {
        break;
      }

      for (const hit of hits) {
        const source = hit._source as
          | {
              rules?: {
                regex_rules?: unknown[];
                ner_rules?: unknown[];
              };
            }
          | undefined;

        if (!hit._id) {
          continue;
        }

        const hasRegex = (source?.rules?.regex_rules?.length ?? 0) > 0;
        const hasNer = (source?.rules?.ner_rules?.length ?? 0) > 0;

        const doc: Record<string, unknown> = {
          migration: {
            ai_anonymization_settings: {
              applied_at: new Date().toISOString(),
            },
          },
        };

        if (!hasRegex && regexRules.length > 0) {
          doc.rules = {
            ...(doc.rules as Record<string, unknown> | undefined),
            regex_rules: regexRules.map((r, i) => ({
              id: `migrated-regex-${i}`,
              type: 'regex',
              entity_class: r.entityClass,
              pattern: r.pattern,
              enabled: true,
            })),
          };
        }

        if (!hasNer && nerRules.length > 0) {
          doc.rules = {
            ...(doc.rules as Record<string, unknown> | undefined),
            ner_rules: nerRules.map((r, i) => ({
              id: `migrated-ner-${i}`,
              type: 'ner',
              model_id: r.modelId,
              allowed_entity_classes: r.allowedEntityClasses ?? [],
              enabled: true,
            })),
          };
        }

        await esClient.update({
          index: ANONYMIZATION_PROFILES_INDEX,
          id: hit._id,
          doc,
          refresh: 'wait_for',
        });
      }

      const lastSort = hits[hits.length - 1].sort as FieldValue[] | undefined;
      if (!lastSort || lastSort.length === 0) {
        break;
      }
      searchAfter = lastSort;
    }
  } catch (err) {
    logger.error(
      `Failed to migrate ai:anonymizationSettings in space ${namespace}: ${(err as Error).message}`
    );
  }
};
