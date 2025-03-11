/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import { CASES_ATTACHMENT_CHANGE_POINT_CHART } from '@kbn/aiops-change-point-detection/constants';
import { CASES_ATTACHMENT_LOG_PATTERN } from '@kbn/aiops-log-pattern-analysis/constants';
import { CASES_ATTACHMENT_LOG_RATE_ANALYSIS } from '@kbn/aiops-log-rate-analysis/constants';

export function registerCasesPersistableState(cases: CasesServerSetup | undefined, logger: Logger) {
  if (cases) {
    try {
      cases.attachmentFramework.registerPersistableState({
        id: CASES_ATTACHMENT_CHANGE_POINT_CHART,
      });
      cases.attachmentFramework.registerPersistableState({
        id: CASES_ATTACHMENT_LOG_PATTERN,
      });
      cases.attachmentFramework.registerPersistableState({
        id: CASES_ATTACHMENT_LOG_RATE_ANALYSIS,
      });
    } catch (error) {
      logger.warn(`AIOPs failed to register cases persistable state`);
    }
  }
}
