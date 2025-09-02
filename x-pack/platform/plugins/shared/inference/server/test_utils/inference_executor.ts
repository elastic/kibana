/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import type { InferenceExecutor } from '../chat_complete/utils';
import { createInferenceConnectorMock } from './inference_connector';

export const createInferenceExecutorMock = ({
  connector = createInferenceConnectorMock(),
}: { connector?: InferenceConnector } = {}): jest.Mocked<InferenceExecutor> => {
  return {
    getConnector: jest.fn().mockReturnValue(connector),
    invoke: jest.fn(),
  };
};
