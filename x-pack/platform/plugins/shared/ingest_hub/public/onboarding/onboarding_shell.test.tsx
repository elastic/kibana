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

// apigateway_logs  → cloud_forwarder (non-agentless): needsAuthenticateAndDeployStep = false
// apigateway_metrics → agentless: needsAuthenticateAndDeployStep = true
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
   * When both agentless and non-agentless services are selected, Continue from
   * services goes to service-settings (not skipped). After completing it and
   * going back to services, removing the non-agentless service changes the
   * selection and must mark service-settings incomplete again so the indicator
   * is no longer clickable.
   */
  describe('path 1: stepper skip via indicator', () => {
    it('marks service-settings incomplete after the service selection changes', async () => {
      const { history, setIds } = renderShell('#services');

      // Select an agentless service so needsAuthenticateAndDeployStep = true
      // and Continue goes to service-settings (not skipped).
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

  /**
   * Path 2: authenticate-and-deploy auto-complete / agentless flip.
   *
   * With only non-agentless services selected, Continue from services
   * auto-marks authenticate-and-deploy complete and skips it. Adding an agentless
   * service (which requires authenticate-and-deploy) must invalidate that stale
   * complete flag so the credentials step can no longer be skipped.
   */
  describe('path 2: agentless flip — authenticate-and-deploy wrongly skipped', () => {
    it('marks authenticate-and-deploy incomplete when selection switches to include an agentless service', async () => {
      const { history, setIds } = renderShell('#services');

      // Select only a non-agentless service: needsAuthenticateAndDeployStep = false.
      await setIds([NON_AGENTLESS_ID]);

      // Continue from services — authenticate-and-deploy is auto-marked complete and
      // the flow jumps past it to deploy-and-detect.
      act(() => screen.getByTestId('servicesStep-continue').click());
      expect(history.location.hash).toBe('#deploy-and-detect');
      expect(stepIndicatorStatus('authenticate-and-deploy')).toBe('complete');

      // Go back to services
      act(() => history.push('/aws#services'));

      // Add an agentless service — now needsAuthenticateAndDeployStep = true.
      // The previously auto-completed authenticate-and-deploy must be invalidated.
      await setIds([NON_AGENTLESS_ID, AGENTLESS_ID]);

      expect(stepIndicatorStatus('authenticate-and-deploy')).toBe('incomplete');
    });
  });
});
