/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationRegexWorkerTaskPayload } from '@kbn/inference-common';
import type { AnonymizationState } from '../chat_complete/anonymization/types';
import { RegexWorkerService } from '../chat_complete/anonymization/regex_worker_service';

export const createRegexWorkerServiceMock = () => {
  const mock = {
    run: jest.fn(
      ({ records }: AnonymizationRegexWorkerTaskPayload): Promise<AnonymizationState> =>
        Promise.resolve({ records, anonymizations: [] })
    ),
    stop: jest.fn().mockResolvedValue(undefined),
  };
  return mock as unknown as RegexWorkerService;
};
