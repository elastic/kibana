/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());

import { useOnboardingFlow } from '../onboarding_flow_context';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { DeployAndDetectStep } from './deploy_and_detect_step';
import { AWS_SERVICES_MAP } from '../aws_service_matrix';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseSessionStorage = useSessionStorage as jest.Mock;

function setupMocks({
  serviceStatuses = {} as Record<string, string>,
  failedInstances = [] as string[],
  deployErrors = {} as Record<string, string>,
  isDeploying = false,
  instances = undefined as
    | Array<{ instanceId: string; serviceId: string; name: string; isDuplicate: boolean }>
    | undefined,
} = {}) {
  const retryDeploy = jest.fn();
  mockUseOnboardingFlow.mockReturnValue({
    deployAndDetectStep: {
      isDeploying,
      serviceStatuses,
      failedInstances,
      deployErrors,
      policyIdsByInstance: {},
    },
    awsServicesMap: AWS_SERVICES_MAP,
    retryDeploy,
  });
  mockUseSessionStorage.mockReturnValue([
    { instances, serviceVars: {}, globalRegion: '' },
    jest.fn(),
  ]);
  return { retryDeploy };
}

function renderStep(props: { onContinue?: () => void; onBack?: () => void } = {}) {
  return render(
    <I18nProvider>
      <DeployAndDetectStep onContinue={props.onContinue ?? jest.fn()} onBack={props.onBack} />
    </I18nProvider>
  );
}

describe('DeployAndDetectStep', () => {
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

  describe('error callout', () => {
    it('shows the error callout when there are failed instances', () => {
      setupMocks({
        serviceStatuses: { inst_a: 'error' },
        failedInstances: ['inst_a'],
        deployErrors: { inst_a: 'Connection timed out' },
        instances: [
          { instanceId: 'inst_a', serviceId: 'svc', name: 'My Service', isDuplicate: false },
        ],
      });

      renderStep();
      expect(screen.getByTestId('deployAndDetectStep-errorCallout')).toBeInTheDocument();
      expect(screen.getByText('Connection timed out')).toBeInTheDocument();
    });

    it('shows chip label in the error callout when no deployError message is available', () => {
      setupMocks({
        serviceStatuses: { inst_a: 'error' },
        failedInstances: ['inst_a'],
        deployErrors: {},
        instances: [
          { instanceId: 'inst_a', serviceId: 'svc', name: 'My Service', isDuplicate: false },
        ],
      });

      renderStep();
      const callout = screen.getByTestId('deployAndDetectStep-errorCallout');
      expect(callout).toBeInTheDocument();
      // Falls back to chip label (instance name) — at least one occurrence inside the callout.
      expect(callout).toHaveTextContent('My Service');
    });

    it('does not show the error callout when there are no failed instances', () => {
      setupMocks({
        serviceStatuses: { inst_a: 'receiving' },
        failedInstances: [],
      });

      renderStep();
      expect(screen.queryByTestId('deployAndDetectStep-errorCallout')).not.toBeInTheDocument();
    });

    it('hides the error callout while deploying even if failedInstances is non-empty', () => {
      setupMocks({
        serviceStatuses: { inst_a: 'instantiating' },
        failedInstances: ['inst_a'],
        isDeploying: true,
      });

      renderStep();
      expect(screen.queryByTestId('deployAndDetectStep-errorCallout')).not.toBeInTheDocument();
    });
  });

  describe('retry button', () => {
    it('calls retryDeploy with the current failedInstances when clicked', () => {
      const { retryDeploy } = setupMocks({
        serviceStatuses: { inst_a: 'error', inst_b: 'error' },
        failedInstances: ['inst_a', 'inst_b'],
        deployErrors: { inst_a: 'err', inst_b: 'err' },
        instances: [
          { instanceId: 'inst_a', serviceId: 'svc', name: 'A', isDuplicate: false },
          { instanceId: 'inst_b', serviceId: 'svc', name: 'B', isDuplicate: false },
        ],
      });

      renderStep();
      fireEvent.click(screen.getByTestId('deployAndDetectStep-retryButton'));

      expect(retryDeploy).toHaveBeenCalledWith(['inst_a', 'inst_b']);
    });
  });

  describe('continue button', () => {
    it('shows continue button when all deployments succeeded', () => {
      setupMocks({
        serviceStatuses: { inst_a: 'receiving' },
        failedInstances: [],
        isDeploying: false,
      });

      const onContinue = jest.fn();
      renderStep({ onContinue });
      const btn = screen.getByTestId('deployAndDetectStep-continueButton');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('does not show continue button while deploying', () => {
      setupMocks({
        serviceStatuses: { inst_a: 'instantiating' },
        isDeploying: true,
      });

      renderStep();
      expect(screen.queryByTestId('deployAndDetectStep-continueButton')).not.toBeInTheDocument();
    });

    it('does not show continue button when there are failed instances', () => {
      setupMocks({
        serviceStatuses: { inst_a: 'error' },
        failedInstances: ['inst_a'],
      });

      renderStep();
      expect(screen.queryByTestId('deployAndDetectStep-continueButton')).not.toBeInTheDocument();
    });
  });
});
