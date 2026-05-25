/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnboardingStatus } from '@kbn/streams-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { OnboardingWorkflowClient } from '../../../lib/workflows/onboarding_workflow_client';
import { getKiIdentificationStatusToolHandler } from './handler';

describe('getKiIdentificationStatusToolHandler', () => {
  const createClient = (results: Array<Record<string, unknown>> = []) =>
    new OnboardingWorkflowClient({
      managementApi: {
        getWorkflowExecutions: jest.fn().mockResolvedValue({ results }),
        getWorkflowExecution: jest.fn().mockResolvedValue(null),
      } as never,
    });

  it('returns NotStarted when no executions exist', async () => {
    const onboardingClient = createClient([]);

    const result = await getKiIdentificationStatusToolHandler({
      streamName: 'logs.nginx',
      onboardingClient,
    });

    expect(result).toEqual({
      stream_name: 'logs.nginx',
      status: OnboardingStatus.NotStarted,
    });
  });

  it('returns Completed status for a completed execution', async () => {
    const onboardingClient = new OnboardingWorkflowClient({
      managementApi: {
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'exec-1',
              status: ExecutionStatus.COMPLETED,
              startedAt: '2026-01-01T00:00:00Z',
              finishedAt: '2026-01-01T00:01:00Z',
              error: null,
            },
          ],
        }),
        getWorkflowExecution: jest.fn().mockResolvedValue({
          context: {
            output: {
              featuresSkipped: false,
              discoveredFeatures: ['f1', 'f2'],
              featuresConnectorUsed: 'connector-1',
              queriesSkipped: false,
              persistedQueries: ['q1'],
              queriesConnectorUsed: 'connector-2',
            },
          },
        }),
      } as never,
    });

    const result = await getKiIdentificationStatusToolHandler({
      streamName: 'logs.nginx',
      onboardingClient,
    });

    expect(result).toEqual({
      stream_name: 'logs.nginx',
      status: OnboardingStatus.Completed,
      featuresSkipped: false,
      discoveredFeaturesCount: 2,
      featuresConnectorUsed: 'connector-1',
      queriesSkipped: false,
      persistedQueriesCount: 1,
      queriesConnectorUsed: 'connector-2',
    });
  });

  it('returns Failed status with error message for timed-out executions', async () => {
    const onboardingClient = createClient([
      {
        id: 'exec-2',
        status: ExecutionStatus.TIMED_OUT,
        startedAt: '2026-01-01T00:00:00Z',
        finishedAt: '2026-01-01T00:05:00Z',
        error: null,
      },
    ]);

    const result = await getKiIdentificationStatusToolHandler({
      streamName: 'logs.nginx',
      onboardingClient,
    });

    expect(result).toEqual({
      stream_name: 'logs.nginx',
      status: OnboardingStatus.Failed,
      error: 'Onboarding workflow timed out',
    });
  });
});
