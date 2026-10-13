/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  catchError,
  concatMap,
  distinctUntilChanged,
  EMPTY,
  filter,
  firstValueFrom,
  from,
  takeUntil,
} from 'rxjs';
import type { Subject } from 'rxjs';
import type { CoreStart, FeatureFlagsStart, Logger } from '@kbn/core/server';
import { FF_MIGRATE_LEGACY_SECURITY_ASSETS, getErrorMessage } from '../../../common';

/**
 * Reads the migration FF's current settled value without waiting for it to become true.
 * Safe for request and task execution paths (`AssetManagerClient`, the migration task's own
 * run), which must resolve immediately regardless of the flag's value.
 */
export const getLegacySecurityAssetsMigrationFlag = (
  featureFlags: FeatureFlagsStart
): Promise<boolean> =>
  firstValueFrom(featureFlags.getBooleanValue$(FF_MIGRATE_LEGACY_SECURITY_ASSETS, false));

/** Subscribes to migration flag updates and schedules the idempotent migration when enabled. */
export const subscribeToLegacySecurityAssetsMigrationFlag = ({
  coreStart,
  logger,
  stop$,
  scheduleMigration,
}: {
  coreStart: CoreStart;
  logger: Logger;
  stop$: Subject<void>;
  scheduleMigration: () => Promise<void>;
}): void => {
  coreStart.featureFlags
    .getBooleanValue$(FF_MIGRATE_LEGACY_SECURITY_ASSETS, false)
    .pipe(
      distinctUntilChanged(),
      filter(Boolean),
      concatMap(() =>
        from(scheduleMigration()).pipe(
          catchError((error) => {
            logger.error(
              `Error scheduling legacy security assets migration: ${getErrorMessage(error)}`
            );
            return EMPTY;
          })
        )
      ),
      takeUntil(stop$)
    )
    .subscribe();
};
