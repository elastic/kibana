/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';

import { getStreamsPromptsSavedObject } from '../sig_events/saved_objects/prompts_config';
import { getStreamsSignificantEventsSettingsSavedObject } from '../sig_events/saved_objects/model_settings_config';

export const registerStreamsSavedObjects = (savedObjectsService: SavedObjectsServiceSetup) => {
  savedObjectsService.registerType(getStreamsPromptsSavedObject());
  savedObjectsService.registerType(getStreamsSignificantEventsSettingsSavedObject());
};
