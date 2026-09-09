/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '../../common/constants';

export { DEFAULT_SPACE_ID };

/** Resolves the active space id for the request, falling back to `'default'` when spaces is absent. */
export const resolveSpaceId = (
  spaces: { spacesService: { getSpaceId: (request: KibanaRequest) => string } } | undefined,
  request: KibanaRequest
): string => spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
