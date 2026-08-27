/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());

import { useOnboardingFlow } from '../../onboarding_flow_context';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { DetectAndReviewStep } from '.';
import { AWS_SERVICES_MAP } from '../../aws_service_matrix';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseSessionStorage = useSessionStorage as jest.Mock;

function setupMocks({
  serviceStatuses = {} as Record<string, string>,
  instances = undefined as
    | Array<{ instanceId: string; serviceId: string; name: string; isDuplicate: boolean }>
    | undefined,
} = {}) {
  mockUseOnboardingFlow.mockReturnValue({
    detectAndReviewStep: {
      serviceStatuses,
      policyIdsByInstance: {},
    },
    awsServicesMap: AWS_SERVICES_MAP,
  });
  mockUseSessionStorage.mockReturnValue([
    { instances, serviceVars: {}, globalRegion: '' },
    jest.fn(),
  ]);
}

function renderStep(props: { onContinue?: () => void; onBack?: () => void } = {}) {
  return render(
    <I18nProvider>
      <DetectAndReviewStep onContinue={props.onContinue ?? jest.fn()} onBack={props.onBack} />
    </I18nProvider>
  );
}

describe('DetectAndReviewStep', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('chip labels', () => {
    it('shows instance name from session storage when instanceId matches', () => {
      // Use an agentless service (ec2_metrics) — cloudtrail is an ECF service and is filtered
      // out of the agentless chip row, so it would not appear here.
      setupMocks({
        serviceStatuses: { 'ec2_metrics__dup-1': 'instantiating' },
        instances: [
          {
            instanceId: 'ec2_metrics__dup-1',
            serviceId: 'ec2_metrics',
            name: 'AWS EC2 [Duplicate]',
            isDuplicate: true,
          },
        ],
      });

      renderStep();
      expect(screen.getByText('AWS EC2 [Duplicate]')).toBeInTheDocument();
    });

    it('falls back to AWS_SERVICES_MAP name when instanceId is a known serviceId (original instance)', () => {
      // Original instances keep instanceId === serviceId; no session storage entry needed for them
      // since AWS_SERVICES_MAP covers all known service ids.
      setupMocks({
        serviceStatuses: { ec2_metrics: 'instantiating' },
        instances: undefined,
      });

      renderStep();
      // AWS_SERVICES_MAP has no manifest data; name falls back to entry.id ('ec2_metrics').
      // In production the matrix hook enriches this with the manifest title ('AWS EC2 metrics').
      expect(screen.getByText('ec2_metrics')).toBeInTheDocument();
    });

    it('falls back to the raw instanceId when neither session storage nor service map has a match', () => {
      setupMocks({
        serviceStatuses: { unknown_instance_xyz: 'instantiating' },
        instances: undefined,
      });

      renderStep();
      expect(screen.getByText('unknown_instance_xyz')).toBeInTheDocument();
    });

    it('renders a chip for each entry in serviceStatuses', () => {
      setupMocks({
        serviceStatuses: {
          inst_a: 'instantiating',
          inst_b: 'receiving',
          inst_c: 'error',
        },
        instances: [
          { instanceId: 'inst_a', serviceId: 'svc', name: 'Service A', isDuplicate: false },
          { instanceId: 'inst_b', serviceId: 'svc', name: 'Service B', isDuplicate: false },
          { instanceId: 'inst_c', serviceId: 'svc', name: 'Service C', isDuplicate: false },
        ],
      });

      renderStep();
      expect(screen.getByText('Service A')).toBeInTheDocument();
      expect(screen.getByText('Service B')).toBeInTheDocument();
      expect(screen.getByText('Service C')).toBeInTheDocument();
    });
  });

  describe('continue button', () => {
    it('shows continue button when serviceStatuses has entries', () => {
      setupMocks({
        serviceStatuses: { inst_a: 'receiving' },
      });

      const onContinue = jest.fn();
      renderStep({ onContinue });
      const btn = screen.getByTestId('detectAndReviewStep-continueButton');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('does not show continue button when serviceStatuses is empty', () => {
      setupMocks({ serviceStatuses: {} });

      renderStep();
      expect(screen.queryByTestId('detectAndReviewStep-continueButton')).not.toBeInTheDocument();
    });
  });
});
