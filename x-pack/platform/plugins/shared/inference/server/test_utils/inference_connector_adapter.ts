/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnectorAdapter } from '../chat_complete/types';

export const createInferenceConnectorAdapterMock = (): jest.Mocked<InferenceConnectorAdapter> => {
  return {
    chatComplete: jest.fn(),
  };
};
