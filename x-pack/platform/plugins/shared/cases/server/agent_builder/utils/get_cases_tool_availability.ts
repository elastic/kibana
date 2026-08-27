/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { CasesServerStartDependencies } from '../../types';

export async function getCasesToolAvailability({
  core,
  request,
}: {
  core: CoreSetup<CasesServerStartDependencies>;
  request: KibanaRequest;
}): Promise<ToolAvailabilityResult> {
  try {
    const [, pluginsStart] = await core.getStartServices();
    const activeSpace = await pluginsStart.spaces?.spacesService.getActiveSpace(request);
    if (activeSpace?.solution === 'es') {
      return {
        status: 'unavailable',
        reason: 'Cases is not available in Elasticsearch projects',
      };
    }
  } catch {
    // Spaces service unavailable — default to available
  }
  return { status: 'available' };
}
