/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkUser } from '../../adapters/framework/adapter_types';

export class FrameworkLib {
  public getSetting(setting: 'encryptionKey'): string {
    return 'mockedEncryptionKey';
  }

  public getInternalUser(): FrameworkUser {
    return { kind: 'internal' };
  }

  public expose(key: string, method: any) {}
}
