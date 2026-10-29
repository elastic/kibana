/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { outputType } from '../../../common/constants';
import { withSavedSecrets } from '../secrets/preserve';

import { getOutputSecretFields } from './secret_fields';

describe('getOutputSecretFields', () => {
  describe('Kafka password', () => {
    const original = { auth_type: 'user_pass', secrets: { password: { id: 'password-id' } } };
    const fields = getOutputSecretFields(outputType.Kafka);

    it('keeps the password when the update does not change the authentication type', () => {
      expect(withSavedSecrets({ fields, original, update: { name: 'renamed' } })).toEqual({
        name: 'renamed',
        secrets: { password: { id: 'password-id' } },
      });
    });

    it('keeps the password when the update names user_pass', () => {
      const update = { auth_type: 'user_pass' };

      expect(withSavedSecrets({ fields, original, update })).toEqual({
        ...update,
        secrets: { password: { id: 'password-id' } },
      });
    });

    it('removes the password when the update switches to another authentication type', () => {
      const update = { auth_type: 'ssl' };

      expect(withSavedSecrets({ fields, original, update })).toEqual(update);
    });
  });
});
