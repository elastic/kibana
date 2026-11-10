/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ExportShare, RegisterShareIntegrationArgs } from '@kbn/share-plugin/public';

type PrerequisiteCheck = NonNullable<
  RegisterShareIntegrationArgs<ExportShare>['prerequisiteCheck']
>;

/**
 * Synchronous view of a feature flag, for use in `prerequisiteCheck`. Reports `false` until the
 * flag first emits. Always `true` outside serverless, without subscribing.
 */
export const createServerlessExportGate = ({
  isServerless,
  enabled$,
}: {
  isServerless: boolean;
  enabled$: Observable<boolean>;
}): (() => boolean) => {
  if (!isServerless) {
    return () => true;
  }

  let enabled = false;
  enabled$.subscribe((value) => {
    enabled = value;
  });

  return () => enabled;
};

/** Hides a share integration while `isAvailable()` is false, keeping its own checks otherwise. */
export const withAvailabilityGate = <T extends object>(
  integration: T & { prerequisiteCheck?: PrerequisiteCheck },
  isAvailable: () => boolean
): T & { prerequisiteCheck: PrerequisiteCheck } => ({
  ...integration,
  prerequisiteCheck: (args) => isAvailable() && (integration.prerequisiteCheck?.(args) ?? true),
});
