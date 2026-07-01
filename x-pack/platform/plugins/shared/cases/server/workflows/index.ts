/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { CasesServerSetupDependencies } from '../types';
import type { CasesClient } from '../client';
import type { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';

import { casesStepRegistry } from './registry';

export function registerCaseWorkflowSteps(
  workflowsExtensions: CasesServerSetupDependencies['workflowsExtensions'],
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>,
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry,
  isCasesAttachmentsEnabled: boolean,
  /**
   * Resolves once cases's own `start()` has been called by core
   * Used by the `cases.addAttachments`loader so the discriminated union sees
   * solution-contributed attachment types.
   */
  waitForStartServices: () => Promise<unknown>
) {
  if (!workflowsExtensions) {
    return;
  }

  for (const factory of casesStepRegistry) {
    workflowsExtensions.registerStepDefinition(factory(getCasesClient));
  }
}
