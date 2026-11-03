/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

export const DEFAULT_SPACE_ID = 'default';

/**
 * The part of the Spaces contract that resolves a request's space; Kibana's and a task runtime's
 * (whose requests carry the space id) both provide it.
 */
export interface SpaceIdResolver {
  spacesService: { getSpaceId: (request: KibanaRequest & { spaceId?: string }) => string };
}

export const resolveSpaceId = (
  spaces: SpaceIdResolver | undefined,
  request: KibanaRequest
): string => spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
