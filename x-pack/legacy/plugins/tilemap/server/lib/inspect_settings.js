/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function inspectSettings(xpackInfo) {
  if (!xpackInfo || !xpackInfo.isAvailable()) {
    return {
      message:
        'You cannot use the Tilemap Plugin because license information is not available at this time.',
    };
  }

  /**
   *Propagate these settings to the client
   */
  return {
    license: {
      uid: xpackInfo.license.getUid(),
      active: xpackInfo.license.isActive(),
      valid: xpackInfo.license.isOneOf([
        'trial',
        'standard',
        'basic',
        'gold',
        'platinum',
        'enterprise',
      ]),
    },
  };
}
