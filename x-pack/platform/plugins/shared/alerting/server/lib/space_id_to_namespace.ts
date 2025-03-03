/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export function spaceIdToNamespace(spaces?: SpacesPluginStart, spaceId?: string) {
  return spaces && spaceId ? spaces.spacesService.spaceIdToNamespace(spaceId) : undefined;
}
