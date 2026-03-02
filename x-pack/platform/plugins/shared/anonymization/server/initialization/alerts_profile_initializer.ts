/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ProfilesRepository } from '../repository';
import type { SaltService } from '../salt';
import { getDefaultAlertFieldRules } from './default_field_rules';

export const getAlertsDataViewTargetId = (namespace: string) =>
  `security-solution-alert-${namespace}`;
export const ALERTS_DATA_VIEW_TARGET_TYPE = 'data_view' as const;

/**
 * Ensures the out-of-the-box alerts data view anonymization profile exists
 * in the given space. Idempotent: if the profile already exists, this is a no-op.
 * If the alerts data view does not yet exist, this is a no-op; the lazy path in
 * `resolveEffectivePolicy` will create the profile once the data view is present.
 *
 * This lives in the shared anonymization plugin for Phase 1 so every consumer
 * can rely on consistent backend initialization behavior. We plan to move
 * Security-specific defaults behind Security-owned wiring in a follow-up.
 *
 * Called:
 * - Lazily on first anonymization usage for the alerts data view target
 */
export const ensureAlertsDataViewProfile = async ({
  namespace,
  profilesRepo,
  saltService,
  logger,
  checkDataViewExists,
}: {
  namespace: string;
  profilesRepo: ProfilesRepository;
  saltService: SaltService;
  logger: Logger;
  checkDataViewExists: () => Promise<boolean>;
}): Promise<void> => {
  try {
    const dataViewExists = await checkDataViewExists();
    if (!dataViewExists) {
      logger.debug(
        `Alerts data view not yet created in space: ${namespace}, skipping profile initialization`
      );
      return;
    }

    const targetId = getAlertsDataViewTargetId(namespace);

    // Check if the profile already exists (do not overwrite)
    const existing = await profilesRepo.findByTarget(
      namespace,
      ALERTS_DATA_VIEW_TARGET_TYPE,
      targetId
    );

    if (existing) {
      logger.debug(
        `Security alerts data view anonymization profile already exists in space: ${namespace}`
      );
    } else {
      // Ensure salt exists for this space
      await saltService.getSalt(namespace);

      // Create the default profile
      await profilesRepo.create({
        name: 'Security Alerts Anonymization Profile',
        description: 'Security Alerts data view allow/anonymize/deny rules for SOC workflows',
        targetType: ALERTS_DATA_VIEW_TARGET_TYPE,
        targetId,
        rules: {
          fieldRules: getDefaultAlertFieldRules(),
          regexRules: [],
          nerRules: [],
        },
        namespace,
        createdBy: 'system',
      });

      logger.info(`Created security alerts data view anonymization profile in space: ${namespace}`);
    }
  } catch (err) {
    // If another node created it concurrently, that's fine
    if ((err as { statusCode?: number })?.statusCode === 409) {
      logger.debug(
        `Security alerts data view anonymization profile already exists in space: ${namespace} (concurrent creation)`
      );
      return;
    }
    logger.error(
      `Failed to initialize security alerts data view anonymization profile in space ${namespace}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    throw err;
  }
};
