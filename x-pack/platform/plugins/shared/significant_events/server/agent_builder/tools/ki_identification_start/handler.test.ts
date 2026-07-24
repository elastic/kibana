/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { startKiIdentificationToolHandler } from './handler';
import { KIsOnboardingStep } from '@kbn/significant-events-schema';
import { SignificantEventsPausedError } from '../../../lib/errors/significant_events_paused_error';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';

describe('startKiIdentificationToolHandler', () => {
  const setup = (maintenanceState: 'enabled' | 'paused' = 'enabled') => {
    const managementApi = {
      getWorkflow: jest.fn().mockResolvedValue({
        id: 'system-streams-ki-onboarding',
        name: 'onboarding',
        enabled: true,
        definition: {},
        yaml: '',
      }),
      runWorkflow: jest.fn().mockResolvedValue('execution-id-123'),
    };
    const telemetry = { trackOnboardingScheduled: jest.fn() } as never;
    const streamsKIsOnboardingClient = new SignificantEventsKIsOnboardingClient({
      managementApi: managementApi as never,
      telemetry,
    });
    const maintenanceService = {
      getState: jest.fn().mockResolvedValue(maintenanceState),
    } as unknown as SignificantEventsMaintenanceService;

    return {
      managementApi,
      streamsKIsOnboardingClient,
      maintenanceService,
      request: httpServerMock.createKibanaRequest(),
    };
  };

  it('triggers onboarding workflow and returns tracking Kibana path', async () => {
    const { managementApi, streamsKIsOnboardingClient, maintenanceService, request } = setup();

    const result = await startKiIdentificationToolHandler({
      streamName: 'logs.nginx',
      steps: [KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration],
      streamsKIsOnboardingClient,
      maintenanceService,
      request,
    });

    expect(result).toEqual({
      kibanaPath: '/app/streams/_discovery/knowledge_indicators?stream=logs.nginx',
    });

    expect(managementApi.getWorkflow).toHaveBeenCalledWith('system-streams-ki-onboarding', '*');
    expect(managementApi.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'system-streams-ki-onboarding' }),
      'default',
      expect.objectContaining({
        streamName: 'logs.nginx',
        skipFeatures: false,
        skipQueries: false,
      }),
      request
    );
  });

  it('rejects with SignificantEventsPausedError while paused', async () => {
    const { managementApi, streamsKIsOnboardingClient, maintenanceService, request } =
      setup('paused');

    await expect(
      startKiIdentificationToolHandler({
        streamName: 'logs.nginx',
        steps: [KIsOnboardingStep.FeaturesIdentification],
        streamsKIsOnboardingClient,
        maintenanceService,
        request,
      })
    ).rejects.toBeInstanceOf(SignificantEventsPausedError);

    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
  });

  it('throws when workflow is not found', async () => {
    const { managementApi, streamsKIsOnboardingClient, maintenanceService, request } = setup();
    managementApi.getWorkflow.mockResolvedValue(null);

    await expect(
      startKiIdentificationToolHandler({
        streamName: 'logs.nginx',
        steps: [KIsOnboardingStep.FeaturesIdentification],
        streamsKIsOnboardingClient,
        maintenanceService,
        request,
      })
    ).rejects.toThrow(/Workflow .+ not found/);
  });
});
