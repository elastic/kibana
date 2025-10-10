/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup, OnechatPluginStart } from './types';

const createSetupContractMock = (): jest.Mocked<OnechatPluginSetup> => {
  return {};
};

const createStartContractMock = (): jest.Mocked<OnechatPluginStart> => {
  return {} as OnechatPluginStart;
};

export const onechatMocks = {
  createSetup: createSetupContractMock,
  createStart: createStartContractMock,
};
