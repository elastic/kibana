/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stub, createStubInstance } from 'sinon';
import { Tokens } from '../tokens';
import { AuthenticationProviderOptions } from './base';

export function mockAuthenticationProviderOptions(
  providerOptions: Partial<Pick<AuthenticationProviderOptions, 'basePath'>> = {}
) {
  const client = { callWithRequest: stub(), callWithInternalUser: stub() };
  const log = stub();

  return {
    client,
    log,
    basePath: '/base-path',
    tokens: createStubInstance(Tokens),
    ...providerOptions,
  };
}
