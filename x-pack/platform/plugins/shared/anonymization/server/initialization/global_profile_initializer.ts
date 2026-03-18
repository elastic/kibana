/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { NerRule, RegexRule } from '@kbn/anonymization-common';
import {
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
  isGlobalAnonymizationProfileTarget,
} from '@kbn/anonymization-common';
import type { ProfilesRepository } from '../repository';

export { GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE, GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID };

export const GLOBAL_ANONYMIZATION_PROFILE_NAME = 'Global Anonymization Profile';

export const isGlobalProfileTarget = (targetType: string, targetId: string): boolean =>
  isGlobalAnonymizationProfileTarget(targetType, targetId);

const mergeRulesById = <T extends { id: string }>(existingRules: T[], incomingRules: T[]): T[] => {
  const merged = new Map(existingRules.map((rule) => [rule.id, rule]));

  for (const rule of incomingRules) {
    if (!merged.has(rule.id)) {
      merged.set(rule.id, rule);
    }
  }

  return [...merged.values()];
};

export const ensureGlobalAnonymizationProfile = async ({
  namespace,
  profilesRepo,
  logger,
  createdBy = 'system',
  regexRules = [],
  nerRules = [],
}: {
  namespace: string;
  profilesRepo: ProfilesRepository;
  logger: Logger;
  createdBy?: string;
  regexRules?: RegexRule[];
  nerRules?: NerRule[];
}): Promise<void> => {
  try {
    const existing = await profilesRepo.findByTarget(
      namespace,
      GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
      GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID
    );

    if (!existing) {
      await profilesRepo.create({
        name: GLOBAL_ANONYMIZATION_PROFILE_NAME,
        description: 'Global NER and Regex anonymization rules for all prompts in this space',
        targetType: GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
        targetId: GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
        rules: {
          fieldRules: [],
          regexRules,
          nerRules,
        },
        namespace,
        createdBy,
      });
      logger.info(`Created global anonymization profile in space: ${namespace}`);
      return;
    }

    const mergedRegexRules = mergeRulesById(existing.rules.regexRules ?? [], regexRules);
    const mergedNerRules = mergeRulesById(existing.rules.nerRules ?? [], nerRules);
    const shouldNormalizeFieldRules = existing.rules.fieldRules.length > 0;
    const shouldUpdate =
      shouldNormalizeFieldRules ||
      mergedRegexRules.length !== (existing.rules.regexRules ?? []).length ||
      mergedNerRules.length !== (existing.rules.nerRules ?? []).length;

    if (!shouldUpdate) {
      return;
    }

    await profilesRepo.update(namespace, existing.id, {
      updatedBy: createdBy,
      rules: {
        fieldRules: [],
        regexRules: mergedRegexRules,
        nerRules: mergedNerRules,
      },
    });
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 409) {
      logger.debug(
        `Global anonymization profile already exists in space: ${namespace} (concurrent creation)`
      );
      return;
    }
    throw err;
  }
};
