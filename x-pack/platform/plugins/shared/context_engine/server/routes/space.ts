/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export const DEFAULT_SPACE_ID = 'default';

/**
 * Resolves the active space for a request, falling back to the default space when the spaces plugin
 * is absent. Signals and improvements both live in per-space indices, so every read and write needs
 * this.
 */
export const resolveSpaceId = (
  spaces: SpacesPluginStart | undefined,
  request: KibanaRequest
): string => spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
