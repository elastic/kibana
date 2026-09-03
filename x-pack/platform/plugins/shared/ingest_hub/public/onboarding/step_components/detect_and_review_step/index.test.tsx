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

jest.mock('@kbn/fleet-plugin/public', () => ({
  useGetPackageInfoByKeyQuery: jest.fn(),
}));

jest.mock('./use_service_data_detection', () => ({
  useServiceDataDetection: jest.fn(),
}));

jest.mock('./deployment_summary', () => ({
  DeploymentSummary: ({ totalCount }: { totalCount: number }) => (
    <div data-test-subj="mock-deployment-summary">{totalCount} services</div>
  ),
}));

jest.mock('./installed_content', () => ({
  InstalledContent: () => <div data-test-subj="mock-installed-content" />,
}));

jest.mock('./agent_setup_callout', () => ({
  AgentSetupCallout: () => (
    <div data-test-subj="mock-agent-callout">
      <button data-test-subj="detectAndReviewStep-agentSetupCallout-dismiss" onClick={() => {}}>
        Dismiss
      </button>
    </div>
  ),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: {} }),
}));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';
import { useServiceDataDetection } from './use_service_data_detection';
import { DetectAndReviewStep } from '.';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseSessionStorage = useSessionStorage as jest.Mock;
const mockUseGetPackageInfoByKeyQuery = useGetPackageInfoByKeyQuery as jest.Mock;
const mockUseServiceDataDetection = useServiceDataDetection as jest.Mock;

function setupMocks({
  deploymentMethod = 'managed_integration' as 'managed_integration' | 'agent_based' | 'ecf',
  selectedServiceIds = [] as string[],
  packageData = undefined as object | undefined,
} = {}) {
  mockUseOnboardingFlow.mockReturnValue({
    servicesStep: { selectedServiceIds },
    detectAndReviewStep: {
      serviceStatuses: {},
      policyIdsByInstance: {},
      failedInstances: [],
      deployErrors: {},
    },
    deploymentMethod,
    awsServicesMap: new Map(),
    updateDetectAndReviewStep: jest.fn(),
  });
  mockUseSessionStorage.mockReturnValue([
    { globalRegion: 'us-east-1', serviceVars: {}, instances: [] },
    jest.fn(),
  ]);
  mockUseGetPackageInfoByKeyQuery.mockReturnValue({ data: packageData });
  mockUseServiceDataDetection.mockReturnValue({
    statusByInstanceId: {},
    receivingCount: 0,
    totalCount: 0,
    isTimedOut: false,
  });
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

  describe('step header', () => {
    it('renders title and subtitle', () => {
      setupMocks();
      renderStep();
      expect(screen.getByText('Detect & Review')).toBeInTheDocument();
      expect(screen.getByText(/Review your deployment/)).toBeInTheDocument();
    });
  });

  describe('agent setup callout', () => {
    it('shows callout for agent_based deployment method', () => {
      setupMocks({ deploymentMethod: 'agent_based' });
      renderStep();
      expect(screen.getByTestId('mock-agent-callout')).toBeInTheDocument();
    });

    it('does not show callout for managed_integration', () => {
      setupMocks({ deploymentMethod: 'managed_integration' });
      renderStep();
      expect(screen.queryByTestId('mock-agent-callout')).not.toBeInTheDocument();
    });
  });

  describe('continue button', () => {
    it('is always enabled — step is non-blocking', () => {
      setupMocks();
      renderStep();
      const btn = screen.getByTestId('detectAndReviewStep-continueButton');
      expect(btn).not.toBeDisabled();
    });

    it('calls onContinue when clicked', () => {
      setupMocks();
      const onContinue = jest.fn();
      renderStep({ onContinue });
      fireEvent.click(screen.getByTestId('detectAndReviewStep-continueButton'));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('shows Back button when onBack is provided', () => {
      setupMocks();
      const onBack = jest.fn();
      renderStep({ onBack });
      fireEvent.click(screen.getByText('Back'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('deployment summary', () => {
    it('shows deployment summary when there are selected services', () => {
      setupMocks({ selectedServiceIds: ['ec2'] });
      mockUseServiceDataDetection.mockReturnValue({
        statusByInstanceId: { ec2: 'detecting' },
        receivingCount: 0,
        totalCount: 1,
        isTimedOut: false,
      });
      renderStep();
      expect(screen.getByTestId('mock-deployment-summary')).toBeInTheDocument();
    });

    it('does not show deployment summary when no services are selected', () => {
      setupMocks({ selectedServiceIds: [] });
      renderStep();
      expect(screen.queryByTestId('mock-deployment-summary')).not.toBeInTheDocument();
    });
  });

  describe('installed content', () => {
    it('shows installed content when package has installed_kibana', () => {
      setupMocks({
        packageData: {
          item: {
            installationInfo: {
              installed_kibana: [{ id: 'dash-1', type: 'dashboard' }],
              installed_es: [],
            },
          },
        },
      });
      renderStep();
      expect(screen.getByTestId('mock-installed-content')).toBeInTheDocument();
    });

    it('does not show installed content when package has no assets', () => {
      setupMocks({ packageData: undefined });
      renderStep();
      expect(screen.queryByTestId('mock-installed-content')).not.toBeInTheDocument();
    });

    it('does not render Remove, Install, or checkbox — read-only guard', () => {
      setupMocks({
        packageData: {
          item: {
            installationInfo: {
              installed_kibana: [{ id: 'dash-1', type: 'dashboard' }],
              installed_es: [],
            },
          },
        },
      });
      renderStep();
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
  });
});
