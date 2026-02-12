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

/** Well-known target ID for the alerts data view profile. */
export const ALERTS_DATA_VIEW_TARGET_ID = 'security-solution-default';
export const ALERTS_DATA_VIEW_TARGET_TYPE = 'data_view' as const;

/**
 * Ensures the out-of-the-box alerts data view anonymization profile exists
 * in the given space. Idempotent: if the profile already exists, this is a no-op.
 *
 * Called:
 * - Automatically on startup when Security Solution is available in a space
 * - Lazily on first anonymization usage in Classic view
 */
export const ensureAlertsDataViewProfile = async ({
  namespace,
  profilesRepo,
  saltService,
  migrateLegacySettings,
  logger,
}: {
  namespace: string;
  profilesRepo: ProfilesRepository;
  saltService: SaltService;
  migrateLegacySettings?: () => Promise<void>;
  logger: Logger;
}): Promise<void> => {
  try {
    // Check if the profile already exists (do not overwrite)
    const existing = await profilesRepo.findByTarget(
      namespace,
      ALERTS_DATA_VIEW_TARGET_TYPE,
      ALERTS_DATA_VIEW_TARGET_ID
    );

    if (existing) {
      logger.debug(`Alerts data view anonymization profile already exists in space: ${namespace}`);
      return;
    }

    // Ensure salt exists for this space
    await saltService.getSalt(namespace);
    const saltId = `salt-${namespace}`;

    // Create the default profile
    await profilesRepo.create({
      name: 'Security Default Anonymization Profile',
      description: 'Default allow/anonymize/deny rules for SOC workflows',
      targetType: ALERTS_DATA_VIEW_TARGET_TYPE,
      targetId: ALERTS_DATA_VIEW_TARGET_ID,
      rules: {
        fieldRules: getDefaultAlertFieldRules(),
      },
      saltId,
      namespace,
      createdBy: 'system',
    });

    // Only run advanced settings migration during automatic profile creation.
    if (migrateLegacySettings) {
      await migrateLegacySettings();
    }

    logger.info(`Created alerts data view anonymization profile in space: ${namespace}`);
  } catch (err) {
    // If another node created it concurrently, that's fine
    if ((err as any).statusCode === 409) {
      logger.debug(
        `Alerts data view anonymization profile already exists in space: ${namespace} (concurrent creation)`
      );
      return;
    }
    logger.error(
      `Failed to initialize alerts data view anonymization profile in space ${namespace}: ${err.message}`
    );
  }
};
