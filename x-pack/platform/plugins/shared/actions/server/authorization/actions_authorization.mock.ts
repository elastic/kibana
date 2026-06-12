/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsAuthorization } from './actions_authorization';

export type ActionsAuthorizationMock = jest.Mocked<PublicMethodsOf<ActionsAuthorization>>;

const createActionsAuthorizationMock = () => {
  const mocked: ActionsAuthorizationMock = {
    ensureAuthorized: jest.fn(),
  };
  return mocked;
};

export const actionsAuthorizationMock: {
  create: () => ActionsAuthorizationMock;
} = {
  create: createActionsAuthorizationMock,
};
