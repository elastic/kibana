/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('./authenticate_and_deploy_step/use_deploy', () => ({
  useDeploy: jest.fn(),
}));

jest.mock('./authenticate_and_deploy_step/deployment_method_card', () => ({
  DeploymentMethodCard: () => null,
}));

jest.mock('./authenticate_and_deploy_step/managed_integrations_section', () => ({
  ManagedIntegrationsSection: jest.fn(),
}));

jest.mock('./ecf_deployment_section', () => ({
  useEcfDeployment: jest.fn(),
  EcfDeploymentSection: jest.fn(),
}));

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(() => ({ services: { cloud: undefined } })),
}));

import { useOnboardingFlow } from '../onboarding_flow_context';
import { useDeploy } from './authenticate_and_deploy_step/use_deploy';
import { ManagedIntegrationsSection } from './authenticate_and_deploy_step/managed_integrations_section';
import { useEcfDeployment, EcfDeploymentSection } from './ecf_deployment_section';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { AuthenticateAndDeployStep } from './authenticate_and_deploy_step';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseDeploy = useDeploy as jest.Mock;
const MockManagedIntegrationsSection = ManagedIntegrationsSection as unknown as jest.Mock;
const mockUseEcfDeployment = useEcfDeployment as jest.Mock;
const MockEcfDeploymentSection = EcfDeploymentSection as unknown as jest.Mock;
const mockUseSessionStorage = useSessionStorage as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const miService = {
  id: 'guardduty',
  name: 'AWS GuardDuty',
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
  identityFederationSupported: true,
  showInUI: true,
};

const ecfService = {
  id: 'cloudtrail',
  name: 'AWS CloudTrail',
  deploymentMethods: [{ method: 'ecf', preferred: true }],
  identityFederationSupported: false,
  showInUI: true,
};

const awsServicesMapWithMI = new Map([['guardduty', miService]]);
const awsServicesMapEmpty = new Map();

function makeDeployReturn(
  overrides: {
    handleDeploy?: jest.Mock;
    isDeploying?: boolean;
    failedInstances?: string[];
    isAlreadyDeployed?: boolean;
  } = {}
) {
  return {
    handleDeploy: overrides.handleDeploy ?? jest.fn(),
    isDeploying: overrides.isDeploying ?? false,
    failedInstances: overrides.failedInstances ?? [],
    isAlreadyDeployed: overrides.isAlreadyDeployed ?? false,
    namespace: 'default',
    setNamespace: jest.fn(),
  };
}

function makeEcfReturn(
  overrides: { hasAnyEcf?: boolean; isDone?: boolean } = {}
): ReturnType<typeof useEcfDeployment> {
  return {
    hasAnyEcf: overrides.hasAnyEcf ?? false,
    isDone: overrides.isDone ?? false,
    ecfServiceIds: new Set(),
    sectionProps: {
      ecfUnifiedConfigs: [],
      ecfOtelConfigs: [],
      ecfCrowdstrikeServices: [],
      unifiedLaunchUrl: undefined,
      otelLaunchUrl: undefined,
      crowdstrikeLaunchUrl: undefined,
      globalRegion: 'us-east-1',
      launchedFamilies: [],
      onLaunch: jest.fn(),
    },
  };
}

function renderStep(onContinue = jest.fn(), onBack?: () => void) {
  return render(
    <I18nProvider>
      <AuthenticateAndDeployStep onContinue={onContinue} onBack={onBack} />
    </I18nProvider>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthenticateAndDeployStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['guardduty'] },
      awsServicesMap: awsServicesMapWithMI,
      deploymentMethod: 'managed_integration',
      setDeploymentMethod: jest.fn(),
    });
    mockUseDeploy.mockReturnValue(makeDeployReturn());
    mockUseEcfDeployment.mockReturnValue(makeEcfReturn());
    mockUseSessionStorage.mockReturnValue([
      { globalRegion: 'us-east-1', serviceVars: {}, instances: [] },
      jest.fn(),
    ]);
    MockManagedIntegrationsSection.mockImplementation(
      ({ onDeploy, hasFailed }: { onDeploy: () => void; hasFailed: boolean }) => (
        <div>
          <button data-test-subj="mock-deploy-btn" onClick={onDeploy}>
            Deploy
          </button>
          {hasFailed && <span data-test-subj="mock-failed">Failed</span>}
        </div>
      )
    );
    MockEcfDeploymentSection.mockImplementation(
      ({ onLaunch }: { onLaunch: (f: string) => void }) => (
        <div>
          <button data-test-subj="mock-ecf-launch-btn" onClick={() => onLaunch('unified')}>
            Launch CloudFormation
          </button>
        </div>
      )
    );
  });

  describe('Next button gating — MI services present', () => {
    it('Next is disabled initially', () => {
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('Next enables after deploy with no failures', () => {
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });

    it('Next remains disabled when isDeploying is true', () => {
      mockUseDeploy.mockReturnValue(makeDeployReturn({ isDeploying: true }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('Next remains disabled after deploy with failures', () => {
      mockUseDeploy.mockReturnValue(makeDeployReturn({ failedInstances: ['guardduty'] }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('passes hasFailed=true to section after failed deploy', () => {
      mockUseDeploy.mockReturnValue(makeDeployReturn({ failedInstances: ['guardduty'] }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('mock-failed')).toBeInTheDocument();
    });
  });

  describe('Next button gating — already deployed', () => {
    it('Next is enabled immediately when isAlreadyDeployed', () => {
      mockUseDeploy.mockReturnValue(makeDeployReturn({ isAlreadyDeployed: true }));
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });
  });

  describe('persisted failure survives remount', () => {
    // This is the invariant review comment r3842293220 asked about:
    // a user who deploys, gets an error, navigates Back/Next, and returns to Step 3 must still see
    // the error callout and Next must stay disabled — the hook seeds failedInstances from session
    // storage, so the local state does not reset on remount.

    it('hasFailed=true when hook returns non-empty failedInstances on first render (no deploy attempted)', () => {
      // Simulates the hook having been seeded from persisted detectAndReviewStep.failedInstances.
      mockUseDeploy.mockReturnValue(
        makeDeployReturn({ failedInstances: ['guardduty'], isDeploying: false })
      );
      renderStep();
      // hasFailed must be true without a prior deploy click in this render cycle.
      expect(screen.getByTestId('mock-failed')).toBeInTheDocument();
    });

    it('Next stays disabled when hook returns failures on first render (no deploy attempted)', () => {
      mockUseDeploy.mockReturnValue(
        makeDeployReturn({ failedInstances: ['guardduty'], isDeploying: false })
      );
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });
  });

  describe('Next button gating — no MI services', () => {
    it('Next is enabled without deploying when no MI or ECF services', () => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: [] },
        awsServicesMap: awsServicesMapEmpty,
        deploymentMethod: 'managed_integration',
        setDeploymentMethod: jest.fn(),
      });
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: false }));
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });
  });

  describe('deploy routing', () => {
    it('initial deploy calls handleDeploy with no args', () => {
      const mockHandleDeploy = jest.fn();
      mockUseDeploy.mockReturnValue(makeDeployReturn({ handleDeploy: mockHandleDeploy }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(mockHandleDeploy).toHaveBeenCalledTimes(1);
      expect(mockHandleDeploy).toHaveBeenCalledWith();
    });

    it('retry calls handleDeploy with failed instance ids', () => {
      const mockHandleDeploy = jest.fn();
      mockUseDeploy.mockReturnValue(
        makeDeployReturn({ handleDeploy: mockHandleDeploy, failedInstances: ['guardduty'] })
      );
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(mockHandleDeploy).toHaveBeenCalledWith(['guardduty']);
    });
  });

  describe('Next calls onContinue', () => {
    it('invokes onContinue when Next clicked after successful deploy', () => {
      const onContinue = jest.fn();
      renderStep(onContinue);
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      fireEvent.click(screen.getByTestId('authenticateAndDeployStep-nextButton'));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('ECF section — Next button gating', () => {
    beforeEach(() => {
      // Switch to ECF-only service (no MI)
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['cloudtrail'] },
        awsServicesMap: new Map([['cloudtrail', ecfService]]),
      });
    });

    it('Next is disabled when ECF is present and not yet launched', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: false }));
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('Next is enabled after ECF launch button clicked (isDone=true)', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: true }));
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });

    it('renders EcfDeploymentSection when hasAnyEcf is true', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: false }));
      renderStep();
      expect(screen.getByTestId('mock-ecf-launch-btn')).toBeInTheDocument();
    });

    it('does not render EcfDeploymentSection when hasAnyEcf is false', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: false }));
      renderStep();
      expect(screen.queryByTestId('mock-ecf-launch-btn')).not.toBeInTheDocument();
    });
  });

  describe('ECF + MI both present', () => {
    beforeEach(() => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['guardduty', 'cloudtrail'] },
        awsServicesMap: new Map([
          ['guardduty', miService],
          ['cloudtrail', ecfService],
        ]),
      });
    });

    it('Next remains disabled when MI deployed but ECF not launched', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: false }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('Next enables when both MI deployed and ECF launched', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: true }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });
  });
});
