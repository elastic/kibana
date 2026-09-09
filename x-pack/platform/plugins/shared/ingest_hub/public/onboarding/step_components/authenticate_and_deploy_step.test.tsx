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

import { useOnboardingFlow } from '../onboarding_flow_context';
import { useDeploy } from './authenticate_and_deploy_step/use_deploy';
import { ManagedIntegrationsSection } from './authenticate_and_deploy_step/managed_integrations_section';
import { AuthenticateAndDeployStep } from './authenticate_and_deploy_step';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseDeploy = useDeploy as jest.Mock;
const MockManagedIntegrationsSection = ManagedIntegrationsSection as unknown as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const miService = {
  id: 'guardduty',
  name: 'AWS GuardDuty',
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
  identityFederationSupported: true,
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
    });
    mockUseDeploy.mockReturnValue(makeDeployReturn());
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
      // Simulates the hook having been seeded from persisted deployAndDetectStep.failedInstances.
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
    it('Next is enabled without deploying', () => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: [] },
        awsServicesMap: awsServicesMapEmpty,
      });
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
});
