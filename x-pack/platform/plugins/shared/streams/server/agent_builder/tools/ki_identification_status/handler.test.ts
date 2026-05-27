/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnboardingStatus } from '@kbn/streams-schema';
import { OnboardingWorkflowClient } from '../../../lib/workflows/onboarding_workflow_client';
import { getKiIdentificationStatusToolHandler } from './handler';

describe('getKiIdentificationStatusToolHandler', () => {
  it('returns stream_name alongside the onboarding status', async () => {
    const onboardingClient = new OnboardingWorkflowClient({
      managementApi: {
        getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [] }),
        getWorkflowExecution: jest.fn().mockResolvedValue(null),
      } as never,
    });

    const result = await getKiIdentificationStatusToolHandler({
      streamName: 'logs.nginx',
      onboardingClient,
    });

    expect(result).toEqual({
      stream_name: 'logs.nginx',
      execution_id: null,
      status: OnboardingStatus.NotStarted,
    });
  });
});
