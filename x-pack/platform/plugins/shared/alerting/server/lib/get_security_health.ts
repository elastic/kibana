/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SecurityHealth {
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
}

export const getSecurityHealth = async (
  isEsSecurityEnabled: () => Promise<boolean | null>,
  isAbleToEncrypt: () => Promise<boolean>,
  areApiKeysEnabled: () => Promise<boolean>
) => {
  const esSecurityIsEnabled = await isEsSecurityEnabled();
  const apiKeysAreEnabled = await areApiKeysEnabled();
  const ableToEncrypt = await isAbleToEncrypt();

  let isSufficientlySecure: boolean;

  if (esSecurityIsEnabled === null) {
    isSufficientlySecure = false;
  } else {
    // if esSecurityIsEnabled = true, then areApiKeysEnabled must be true to enable alerting
    // if esSecurityIsEnabled = false, then it does not matter what areApiKeysEnabled is
    isSufficientlySecure = !esSecurityIsEnabled || (esSecurityIsEnabled && apiKeysAreEnabled);
  }

  const securityHealth: SecurityHealth = {
    isSufficientlySecure,
    hasPermanentEncryptionKey: ableToEncrypt,
  };

  return securityHealth;
};
