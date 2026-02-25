/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { type NerRule, type RegexRule } from '@kbn/anonymization-common';
import type { ProfilesRepository } from '../repository';

const INTERNAL_GLOBAL_PROFILE_TARGET_TYPE = 'index' as const;
const INTERNAL_GLOBAL_PROFILE_TARGET_ID = '__kbn_global_anonymization_profile__';

export {
  INTERNAL_GLOBAL_PROFILE_TARGET_TYPE as GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
  INTERNAL_GLOBAL_PROFILE_TARGET_ID as GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
};

export const GLOBAL_ANONYMIZATION_PROFILE_NAME = 'Global Anonymization Profile';

export const isGlobalProfileTarget = (targetType: string, targetId: string): boolean =>
  targetType === INTERNAL_GLOBAL_PROFILE_TARGET_TYPE &&
  targetId === INTERNAL_GLOBAL_PROFILE_TARGET_ID;

const mergeRegexRules = (
  existingRules: RegexRule[],
  incomingRules: RegexRule[]
): { merged: RegexRule[]; changed: boolean } => {
  const existingById = new Map(existingRules.map((rule) => [rule.id, rule]));
  let changed = false;

  for (const rule of incomingRules) {
    if (!existingById.has(rule.id)) {
      existingById.set(rule.id, rule);
      changed = true;
    }
  }

  return { merged: [...existingById.values()], changed };
};
const mergeNerRules = (
  existingRules: NerRule[],
  incomingRules: NerRule[]
): { merged: NerRule[]; changed: boolean } => {
  const existingById = new Map(existingRules.map((rule) => [rule.id, rule]));
  let changed = false;

  for (const rule of incomingRules) {
    if (!existingById.has(rule.id)) {
      existingById.set(rule.id, rule);
      changed = true;
    }
  }

  return { merged: [...existingById.values()], changed };
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
      INTERNAL_GLOBAL_PROFILE_TARGET_TYPE,
      INTERNAL_GLOBAL_PROFILE_TARGET_ID
    );

    if (!existing) {
      await profilesRepo.create({
        name: GLOBAL_ANONYMIZATION_PROFILE_NAME,
        description: 'Global NER and Regex anonymization rules for all prompts in this space',
        targetType: INTERNAL_GLOBAL_PROFILE_TARGET_TYPE,
        targetId: INTERNAL_GLOBAL_PROFILE_TARGET_ID,
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

    const regexMerge = mergeRegexRules(existing.rules.regexRules ?? [], regexRules);
    const nerMerge = mergeNerRules(existing.rules.nerRules ?? [], nerRules);
    const shouldNormalizeFieldRules = existing.rules.fieldRules.length > 0;
    const hasChanges = regexMerge.changed || nerMerge.changed || shouldNormalizeFieldRules;

    if (!hasChanges) {
      return;
    }

    await profilesRepo.update(namespace, existing.id, {
      updatedBy: createdBy,
      rules: {
        fieldRules: [],
        regexRules: regexMerge.merged,
        nerRules: nerMerge.merged,
      },
    });
    logger.info(`Updated global anonymization profile in space: ${namespace}`);
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
