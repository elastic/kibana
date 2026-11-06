/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCasesConfig } from './lib/kibana';
import { useLicense } from './use_license';

/** Technical preview gate for syncing cases with their external incident: flag plus Enterprise. */
export const useIsExternalSyncEnabled = (): boolean => {
  const { bidirectionalSyncEnabled } = useCasesConfig();
  const { isAtLeastEnterprise } = useLicense();

  return bidirectionalSyncEnabled && isAtLeastEnterprise();
};
