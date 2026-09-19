/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { StreamsPluginStartDependencies } from '../../types';

/** Solutions where Streams tools are available (undefined = stateful, no gating). */
const ALLOWED_SOLUTIONS = new Set(['classic', 'oblt', 'security', undefined]);

export const getStreamsToolAvailability = async ({
  core,
  logger,
  request,
}: {
  core: CoreSetup<StreamsPluginStartDependencies>;
  logger: Logger;
  request: KibanaRequest;
}): Promise<ToolAvailabilityResult> => {
  try {
    const [, pluginsStart] = await core.getStartServices();
    const activeSpace = await pluginsStart.spaces?.spacesService.getActiveSpace(request);
    if (!ALLOWED_SOLUTIONS.has(activeSpace?.solution)) {
      return {
        status: 'unavailable',
        reason: 'Streams is not available in this project type',
      };
    }
  } catch (error) {
    logger.debug('Streams tool availability check failed, defaulting to available.');
    logger.debug(error instanceof Error ? error.message : String(error));
  }
  return { status: 'available' };
};

/**
 * Returns the availability config object to attach to a Streams tool definition.
 * Uses cacheMode 'space' so the check runs once per space, not per request.
 */
export const createStreamsToolAvailability = (
  core: CoreSetup<StreamsPluginStartDependencies>,
  logger: Logger
) => ({
  cacheMode: 'space' as const,
  handler: ({ request }: { request: KibanaRequest }) =>
    getStreamsToolAvailability({ core, logger, request }),
});
