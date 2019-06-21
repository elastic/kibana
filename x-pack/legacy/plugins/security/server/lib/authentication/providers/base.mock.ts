/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stub } from 'sinon';
import { AuthenticationProviderOptions } from './base';

export function mockAuthenticationProviderOptions(
  providerOptions: Partial<AuthenticationProviderOptions> = {}
) {
  return {
    client: { callWithRequest: stub(), callWithInternalUser: stub() },
    log: stub(),
    basePath: '/base-path',
    ...providerOptions,
  };
}
