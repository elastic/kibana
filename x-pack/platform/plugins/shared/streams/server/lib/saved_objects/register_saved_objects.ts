/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';

import { getStreamsPromptsSavedObject } from '../prompts/prompts_config';
import {
  streamsConfigurationEncryptedType,
  streamsConfigurationSavedObjectType,
  streamsUiMetadataSavedObjectType,
} from './streams_configuration';

export const registerStreamsSavedObjects = (
  savedObjects: SavedObjectsServiceSetup,
  {
    isStreamsCanvasEnabled,
    encryptedSavedObjects,
  }: {
    isStreamsCanvasEnabled: boolean;
    encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  }
) => {
  savedObjects.registerType(getStreamsPromptsSavedObject());

  if (isStreamsCanvasEnabled) {
    // eslint-disable-next-line @kbn/eslint/no_conditional_saved_object_type_registration -- TODO: remove once streams-configuration graduates from WIP
    savedObjects.registerType(streamsConfigurationSavedObjectType);
    encryptedSavedObjects.registerType(streamsConfigurationEncryptedType);
    // eslint-disable-next-line @kbn/eslint/no_conditional_saved_object_type_registration -- TODO: remove once streams-ui-metadata graduates from WIP
    savedObjects.registerType(streamsUiMetadataSavedObjectType);
  }
};
