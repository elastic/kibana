/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/core/server';
import {
  ANONYMIZATION_ENTITY_CLASSES,
  NER_ENTITY_CLASSES,
  type AnonymizationEntityClass,
  type NerEntityClass,
  type NerRule,
  type RegexRule,
} from '@kbn/anonymization-common';
import type { ProfilesRepository } from '../repository';
import { ensureGlobalAnonymizationProfile } from './global_profile_initializer';

export const LEGACY_ANONYMIZATION_UI_SETTING_KEY = 'ai:anonymizationSettings';

interface LegacyRegexRule {
  type: 'RegExp';
  enabled: boolean;
  pattern: string;
  entityClass: string;
}

interface LegacyNerRule {
  type: 'NER';
  enabled: boolean;
  modelId?: string;
  allowedEntityClasses?: string[];
}

type LegacyRule = LegacyRegexRule | LegacyNerRule;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLegacyRegexRule = (rule: unknown): rule is LegacyRegexRule =>
  isRecord(rule) &&
  rule.type === 'RegExp' &&
  typeof rule.enabled === 'boolean' &&
  typeof rule.pattern === 'string' &&
  typeof rule.entityClass === 'string';

const isLegacyNerRule = (rule: unknown): rule is LegacyNerRule =>
  isRecord(rule) && rule.type === 'NER' && typeof rule.enabled === 'boolean';

const toRuleId = (prefix: 'regex' | 'ner', payload: string): string =>
  `legacy-${prefix}-${createHash('sha256').update(payload).digest('hex').slice(0, 16)}`;

const toRegexRule = (rule: LegacyRegexRule): RegexRule | null => {
  if (!ANONYMIZATION_ENTITY_CLASSES.includes(rule.entityClass as AnonymizationEntityClass)) {
    return null;
  }

  return {
    id: toRuleId('regex', `${rule.entityClass}:${rule.pattern}`),
    type: 'regex',
    entityClass: rule.entityClass as AnonymizationEntityClass,
    pattern: rule.pattern,
    enabled: true,
  };
};
const toNerRule = (rule: LegacyNerRule): NerRule => {
  const allowedEntityClasses = (rule.allowedEntityClasses ?? NER_ENTITY_CLASSES).filter(
    (entityClass): entityClass is NerEntityClass =>
      NER_ENTITY_CLASSES.includes(entityClass as NerEntityClass)
  );

  return {
    id: toRuleId('ner', `${rule.modelId ?? ''}:${allowedEntityClasses.join(',')}`),
    type: 'ner',
    modelId: rule.modelId,
    allowedEntityClasses,
    enabled: true,
  };
};
export const extractEnabledLegacyRules = (
  settingsString: string
): { regexRules: RegexRule[]; nerRules: NerRule[] } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(settingsString);
  } catch {
    return { regexRules: [], nerRules: [] };
  }
  const ruleList = isRecord(parsed) && Array.isArray(parsed.rules) ? parsed.rules : [];

  const enabledRules: LegacyRule[] = [];
  for (const rule of ruleList) {
    if (isLegacyRegexRule(rule) || isLegacyNerRule(rule)) {
      if (rule.enabled) {
        enabledRules.push(rule);
      }
    }
  }

  const regexRules = enabledRules
    .filter((rule): rule is LegacyRegexRule => rule.type === 'RegExp')
    .map(toRegexRule)
    .filter((rule): rule is RegexRule => Boolean(rule));

  const nerRules = enabledRules
    .filter((rule): rule is LegacyNerRule => rule.type === 'NER')
    .map((rule) => toNerRule(rule));

  return { regexRules, nerRules };
};

export const migrateLegacyUiSettingsIntoGlobalProfile = async ({
  namespace,
  settingsString,
  profilesRepo,
  logger,
}: {
  namespace: string;
  settingsString?: string;
  profilesRepo: ProfilesRepository;
  logger: Logger;
}): Promise<boolean> => {
  if (!settingsString) {
    return true;
  }

  try {
    const { regexRules, nerRules } = extractEnabledLegacyRules(settingsString);
    if (!regexRules.length && !nerRules.length) {
      return true;
    }

    await ensureGlobalAnonymizationProfile({
      namespace,
      profilesRepo,
      logger,
      createdBy: 'system',
      regexRules,
      nerRules,
    });
    return true;
  } catch (err) {
    logger.warn(
      `Failed migrating legacy anonymization UI settings in space ${namespace}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return false;
  }
};
