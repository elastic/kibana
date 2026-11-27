/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { SpacesService } from './spaces_service';

/**
 * Builds a real {@link SpacesService} over the Spaces plugin start mock, so tests can
 * drive its behavior (and assert) through `spaces.spacesService.*` jest mocks.
 */
export const createSpacesServiceMock = (
  spaces: ReturnType<typeof spacesMock.createStart> = spacesMock.createStart()
): { spacesService: SpacesService; spaces: ReturnType<typeof spacesMock.createStart> } => ({
  spacesService: new SpacesService(spaces as unknown as SpacesPluginStart),
  spaces,
});
