/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';

import { getStreamsPromptsSavedObject } from '../prompts/prompts_config';
import {
  streamsConfigurationSavedObjectType,
  streamsUiMetadataSavedObjectType,
} from './streams_configuration';

export const registerStreamsSavedObjects = (
  savedObjectsService: SavedObjectsServiceSetup,
  { isStreamsCanvasEnabled }: { isStreamsCanvasEnabled: boolean }
) => {
  savedObjectsService.registerType(getStreamsPromptsSavedObject());

  if (isStreamsCanvasEnabled) {
    savedObjectsService.registerType(streamsConfigurationSavedObjectType);
    savedObjectsService.registerType(streamsUiMetadataSavedObjectType);
  }
};
