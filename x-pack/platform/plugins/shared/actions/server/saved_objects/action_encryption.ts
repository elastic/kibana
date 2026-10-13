/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

export const ACTION_ATTRIBUTES_INCLUDED_IN_AAD = new Set([
  'actionTypeId',
  'isMissingSecrets',
  'config',
]);

const ACTION_ATTRIBUTES_TO_ENCRYPT_V2 = new Set(['secrets']);
const ACTION_ATTRIBUTES_TO_ENCRYPT_V3 = new Set(['secrets', 'apiKey', 'uiamApiKey']);

export const actionEncryptedRegistrationV2: EncryptedSavedObjectTypeRegistration = {
  type: ACTION_SAVED_OBJECT_TYPE,
  attributesToEncrypt: ACTION_ATTRIBUTES_TO_ENCRYPT_V2,
  attributesToIncludeInAAD: ACTION_ATTRIBUTES_INCLUDED_IN_AAD,
  enforceRandomId: false,
};

export const actionEncryptedRegistrationV3: EncryptedSavedObjectTypeRegistration = {
  type: ACTION_SAVED_OBJECT_TYPE,
  attributesToEncrypt: ACTION_ATTRIBUTES_TO_ENCRYPT_V3,
  attributesToIncludeInAAD: ACTION_ATTRIBUTES_INCLUDED_IN_AAD,
  enforceRandomId: false,
};
