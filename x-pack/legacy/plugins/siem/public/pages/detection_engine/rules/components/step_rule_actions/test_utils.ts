/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionTypeModel } from '../../../../../../../../../plugins/triggers_actions_ui/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TypeRegistry } from '../../../../../../../../../plugins/triggers_actions_ui/public/application/type_registry';

export const getActionTypeRegistryMock = (validateParamsMock: jest.Mock) =>
  (({
    get: jest.fn().mockImplementation(() => ({
      validateParams: validateParamsMock,
    })),
  } as unknown) as TypeRegistry<ActionTypeModel>);
