/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSecurityHealth } from './get_security_health';

const createDependencies = (
  isSecurityEnabled: boolean | null,
  canEncrypt: boolean,
  apiKeysEnabled: boolean
) => {
  const isEsSecurityEnabled = async () => isSecurityEnabled;
  const isAbleToEncrypt = async () => canEncrypt;
  const areApikeysEnabled = async () => apiKeysEnabled;

  const deps: [() => Promise<boolean | null>, () => Promise<boolean>, () => Promise<boolean>] = [
    isEsSecurityEnabled,
    isAbleToEncrypt,
    areApikeysEnabled,
  ];

  return deps;
};

describe('Get security health', () => {
  describe('Correctly returns the overall security health', () => {
    test('When ES security enabled status cannot be determined', async () => {
      const deps = createDependencies(null, true, true);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: false,
        hasPermanentEncryptionKey: true,
      });
    });

    test('When ES security is disabled', async () => {
      const deps = createDependencies(false, true, true);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: true,
        hasPermanentEncryptionKey: true,
      });
    });

    test('When ES security is enabled, and API keys are disabled', async () => {
      const deps = createDependencies(true, true, false);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: false,
        hasPermanentEncryptionKey: true,
      });
    });

    test('When ES security is enabled, and API keys are enabled', async () => {
      const deps = createDependencies(true, true, true);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: true,
        hasPermanentEncryptionKey: true,
      });
    });

    test('With encryption enabled', async () => {
      const deps = createDependencies(true, true, true);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: true,
        hasPermanentEncryptionKey: true,
      });
    });

    test('With encryption disabled', async () => {
      const deps = createDependencies(true, false, true);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: true,
        hasPermanentEncryptionKey: false,
      });
    });
  });
});
