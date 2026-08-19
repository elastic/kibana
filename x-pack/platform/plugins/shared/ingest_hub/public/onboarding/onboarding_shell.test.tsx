/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router, Route } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('react-use/lib/useSessionStorage');

// Provide a minimal matrix so OnboardingShell renders without a real QueryClient
// or live Fleet package manifests.
jest.mock('./use_aws_service_matrix', () => {
  const matrix = [
    {
      id: 'apigateway_logs',
      name: 'AWS API Gateway',
      category: 'networking_content_delivery',
      signalType: 'logs',
      deploymentMethods: [{ method: 'ecf', preferred: true }],
      packageName: 'aws',
      policyTemplate: 'apigateway',
      defaultEnabled: true,
      showInUI: true,
    },
    {
      id: 'apigateway_metrics',
      name: 'AWS API Gateway',
      category: 'networking_content_delivery',
      signalType: 'metrics',
      deploymentMethods: [{ method: 'managed_integration', preferred: true }],
      packageName: 'aws',
      policyTemplate: 'apigateway',
      defaultEnabled: true,
      showInUI: true,
    },
  ];
  return {
    useAwsServiceMatrix: jest.fn().mockReturnValue({ matrix, isError: false, refetch: jest.fn() }),
    useAwsServicesMap: jest.fn().mockReturnValue(new Map(matrix.map((s) => [s.id, s]))),
  };
});

// Stub heavy step components — we only care about shell-level stepper and navigation.
jest.mock('./step_components', () => ({
  ServicesStep: ({ onContinue }: { onContinue: () => void }) => (
    <button data-test-subj="servicesStep-continue" onClick={onContinue}>
      Continue
    </button>
  ),
  ServiceSettingsStep: ({ onContinue }: { onContinue: () => void }) => (
    <button data-test-subj="serviceSettingsStep-continue" onClick={onContinue}>
      Continue
    </button>
  ),
  AuthenticateAndDeployStep: ({ onContinue }: { onContinue: () => void }) => (
    <button data-test-subj="authenticateAndDeployStep-continue" onClick={onContinue}>
      Continue
    </button>
  ),
  DeployAndDetectStep: () => <div data-test-subj="deployAndDetectStep" />,
}));

import { OnboardingFlowProvider, useOnboardingFlow } from './onboarding_flow_context';
import { OnboardingShell } from './onboarding_shell';

import useSessionStorage from 'react-use/lib/useSessionStorage';

const mockUseSessionStorage = useSessionStorage as jest.MockedFunction<typeof useSessionStorage>;

beforeEach(() => {
  mockUseSessionStorage.mockImplementation((_key, initial) => React.useState(initial));
});

const NON_AGENTLESS_ID = 'apigateway_logs';
const AGENTLESS_ID = 'apigateway_metrics';

function stepIndicatorStatus(stepId: string): string | null {
  return screen.getByTestId(`onboardingStepIndicator-${stepId}`).getAttribute('data-step-status');
}

/** Renders the shell and exposes a setter so tests can change the service selection. */
function renderShell(initialHash = '#services') {
  const history = createMemoryHistory({ initialEntries: [`/aws${initialHash}`] });
  let exposedSetIds: (ids: string[]) => void = () => {};

  function SetterCapture() {
    const { setSelectedServiceIds } = useOnboardingFlow();
    exposedSetIds = setSelectedServiceIds;
    return null;
  }

  render(
    <I18nProvider>
      <OnboardingFlowProvider>
        <SetterCapture />
        <Router history={history}>
          <Route path="/:integrationId">
            <OnboardingShell />
          </Route>
        </Router>
      </OnboardingFlowProvider>
    </I18nProvider>
  );

  return {
    history,
    setIds: (ids: string[]) => act(() => exposedSetIds(ids)),
  };
}

describe('OnboardingShell — downstream step invalidation', () => {
  /**
   * Path 1: stepper-skip via indicator.
   *
   * When both managed_integration and ecf services are selected, Continue from
   * services goes to service-settings (not skipped). After completing it and
   * going back to services, changing the selection must mark service-settings
   * incomplete again so the indicator is no longer clickable.
   */
  describe('path 1: stepper skip via indicator', () => {
    it('marks service-settings incomplete after the service selection changes', async () => {
      const { history, setIds } = renderShell('#services');

      await setIds([AGENTLESS_ID]);

      // Continue from services → service-settings
      act(() => screen.getByTestId('servicesStep-continue').click());
      expect(history.location.hash).toBe('#service-settings');

      // Complete service-settings → now marked complete in the stepper
      act(() => screen.getByTestId('serviceSettingsStep-continue').click());
      expect(history.location.hash).toBe('#authenticate-and-deploy');

      // Go back to services
      act(() => history.push('/aws#services'));
      expect(stepIndicatorStatus('service-settings')).toBe('complete');

      // Change the selection — service-settings should be invalidated
      await setIds([AGENTLESS_ID, NON_AGENTLESS_ID]);

      expect(stepIndicatorStatus('service-settings')).toBe('incomplete');
    });
  });
});
