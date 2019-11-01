/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReindexStatus, ReindexStep } from '../../../../../../../../common/types';

export const mockClient = {
  post: jest.fn().mockResolvedValue({
    lastCompletedStep: ReindexStep.created,
    status: ReindexStatus.inProgress,
  }),
  get: jest.fn().mockResolvedValue({
    status: 200,
    data: {
      warnings: [],
      reindexOp: null,
    },
  }),
};
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue(mockClient),
}));
