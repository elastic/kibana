/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { registerSecretType, SECRET_SAVED_OBJECT_TYPE } from './secret_saved_object';

describe('registerSecretType', () => {
  // The encrypted saved objects check of registered types does not see this type while the
  // plugin is off by default, so this test is what guards its encryption.
  it('encrypts the value and binds it to the name', () => {
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    registerSecretType({
      savedObjects: savedObjectsServiceMock.createSetupContract(),
      encryptedSavedObjects,
    });

    expect(encryptedSavedObjects.registerType).toHaveBeenCalledWith({
      type: SECRET_SAVED_OBJECT_TYPE,
      attributesToEncrypt: new Set(['value']),
      attributesToIncludeInAAD: new Set(['name']),
    });
  });
});
