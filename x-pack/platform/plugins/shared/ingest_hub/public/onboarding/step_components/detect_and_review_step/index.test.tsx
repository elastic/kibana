/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

vi.mock('../../onboarding_flow_context', () => {
      const mocked = {
      useOnboardingFlow: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-use/lib/useSessionStorage', () => vi.fn());

vi.mock('@kbn/fleet-plugin/public', () => {
      const mocked = {
      useGetPackageInfoByKeyQuery: vi.fn(),
      pagePathGetters: {
        integration_details_policies: ({ pkgkey }: { pkgkey: string }) => [
          '/app/integrations',
          `/detail/${pkgkey}/policies`,
        ],
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_service_data_detection', () => {
      const mocked = {
      useServiceDataDetection: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./deployment_summary', () => {
      const mocked = {
      DeploymentSummary: ({ totalCount }: { totalCount: number }) => (
        <div data-test-subj="mock-deployment-summary">{totalCount} services</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./installed_content', () => {
      const mocked = {
      InstalledContent: () => <div data-test-subj="mock-installed-content" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_aws_overview_dashboard_url', () => {
      const mocked = {
      useAwsOverviewDashboardUrl: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./agent_setup_callout', () => {
      const mocked = {
      AgentSetupCallout: () => (
        <div data-test-subj="mock-agent-callout">
          <button data-test-subj="detectAndReviewStep-agentSetupCallout-dismiss" onClick={() => {}}>
            Dismiss
          </button>
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useKibana: () => ({
        services: { http: { basePath: { prepend: (path: string) => `/base${path}` } } },
      }),
    };
      return { ...mocked, default: mocked };
    });

import { useOnboardingFlow } from '../../onboarding_flow_context';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';
import { useServiceDataDetection } from './use_service_data_detection';
import { useAwsOverviewDashboardUrl } from './use_aws_overview_dashboard_url';
import { DetectAndReviewStep } from '.';

const mockUseOnboardingFlow = useOnboardingFlow as Mock;
const mockUseSessionStorage = useSessionStorage as Mock;
const mockUseGetPackageInfoByKeyQuery = useGetPackageInfoByKeyQuery as Mock;
const mockUseServiceDataDetection = useServiceDataDetection as Mock;
const mockUseAwsOverviewDashboardUrl = useAwsOverviewDashboardUrl as Mock;

function setupMocks({
  deploymentMethod = 'managed_integration' as 'managed_integration' | 'agent_based' | 'ecf',
  selectedServiceIds = [] as string[],
  packageData = undefined as object | undefined,
  overviewHref = undefined as string | undefined,
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
    updateDetectAndReviewStep: vi.fn(),
  });
  mockUseSessionStorage.mockReturnValue([
    { globalRegion: 'us-east-1', serviceVars: {}, instances: [] },
    vi.fn(),
  ]);
  mockUseGetPackageInfoByKeyQuery.mockReturnValue({ data: packageData });
  mockUseServiceDataDetection.mockReturnValue({
    statusByInstanceId: {},
    receivingCount: 0,
    totalCount: 0,
    isTimedOut: false,
  });
  mockUseAwsOverviewDashboardUrl.mockReturnValue(overviewHref);
}

function renderStep(props: { onContinue?: () => void; onBack?: () => void } = {}) {
  return render(
    <I18nProvider>
      <DetectAndReviewStep onContinue={props.onContinue ?? vi.fn()} onBack={props.onBack} />
    </I18nProvider>
  );
}

describe('DetectAndReviewStep', () => {
  beforeEach(() => vi.clearAllMocks());

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
      const onContinue = vi.fn();
      renderStep({ onContinue });
      fireEvent.click(screen.getByTestId('detectAndReviewStep-continueButton'));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('shows Back button when onBack is provided', () => {
      setupMocks();
      const onBack = vi.fn();
      renderStep({ onBack });
      fireEvent.click(screen.getByText('Back'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('has href to the [Metrics AWS] Overview dashboard when the hook resolves one', () => {
      setupMocks({ overviewHref: '/base/app/dashboards#/view/aws-overview-id' });
      renderStep();
      const btn = screen.getByTestId('detectAndReviewStep-continueButton');
      expect(btn).toHaveAttribute('href', '/base/app/dashboards#/view/aws-overview-id');
    });

    it('has no href when the hook returns undefined', () => {
      setupMocks({ overviewHref: undefined });
      renderStep();
      const btn = screen.getByTestId('detectAndReviewStep-continueButton');
      expect(btn).not.toHaveAttribute('href');
    });
  });

  describe('finish button', () => {
    it('renders next to the continue button', () => {
      setupMocks();
      renderStep();
      expect(screen.getByTestId('detectAndReviewStep-finishButton')).toHaveTextContent('Finish');
      expect(screen.getByTestId('detectAndReviewStep-continueButton')).toBeInTheDocument();
    });

    it('links to the versionless AWS Policies tab before package info loads', () => {
      setupMocks({ packageData: undefined });
      renderStep();
      expect(screen.getByTestId('detectAndReviewStep-finishButton')).toHaveAttribute(
        'href',
        '/base/app/integrations/detail/aws/policies'
      );
    });

    it('keeps the versionless href when an older package version is installed', () => {
      setupMocks({
        packageData: {
          item: {
            version: '3.0.0',
            installationInfo: { version: '2.5.0', installed_kibana: [], installed_es: [] },
          },
        },
      });
      renderStep();
      expect(screen.getByTestId('detectAndReviewStep-finishButton')).toHaveAttribute(
        'href',
        '/base/app/integrations/detail/aws/policies'
      );
    });

    it('calls onContinue when clicked', () => {
      setupMocks();
      const onContinue = vi.fn();
      renderStep({ onContinue });
      fireEvent.click(screen.getByTestId('detectAndReviewStep-finishButton'));
      expect(onContinue).toHaveBeenCalledTimes(1);
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
