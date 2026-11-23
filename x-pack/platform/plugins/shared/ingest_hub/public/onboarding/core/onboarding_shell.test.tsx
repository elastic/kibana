/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router, Route } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

jest.mock('react-use/lib/useSessionStorage');

// Provide a minimal matrix so OnboardingShell renders without a real QueryClient
// or live Fleet package manifests.
jest.mock('../use_aws_service_matrix', () => {
  const matrix = [
    {
      id: 'cloudtrail',
      name: 'AWS CloudTrail',
      signalTypes: ['logs'],
      dataStreams: [],
      deploymentMethods: [{ method: 'ecf', preferred: true }],
      packageName: 'aws',
      defaultEnabled: true,
      showInUI: true,
    },
    {
      id: 'ec2',
      name: 'Amazon EC2',
      signalTypes: ['logs', 'metrics'],
      dataStreams: [],
      deploymentMethods: [{ method: 'managed_integration', preferred: true }],
      packageName: 'aws',
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
jest.mock('../step_components', () => ({
  ServicesStep: ({ onContinue, onBack }: { onContinue: () => void; onBack?: () => void }) => (
    <>
      <button data-test-subj="servicesStep-continue" onClick={onContinue}>
        Continue
      </button>
      {onBack && (
        <button data-test-subj="servicesStep-back" onClick={onBack}>
          Back
        </button>
      )}
    </>
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
  DetectAndReviewStep: () => <div data-test-subj="detectAndReviewStep" />,
}));

import { OnboardingFlowProvider, useOnboardingFlow } from '../onboarding_flow_context';
import { OnboardingShell } from './onboarding_shell';
import { discardMarkedSessions } from './onboarding_session_storage';
import {
  AWS_ONBOARDING_TITLE,
  AWS_ONBOARDING_DESCRIPTION,
} from '../../../common/providers/aws/constants';

import useSessionStorage from 'react-use/lib/useSessionStorage';

const mockUseSessionStorage = useSessionStorage as jest.MockedFunction<typeof useSessionStorage>;

beforeEach(() => {
  mockUseSessionStorage.mockImplementation((_key, initial) => React.useState(initial));
});

const NON_AGENTLESS_ID = 'cloudtrail';
const AGENTLESS_ID = 'ec2';

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

describe('OnboardingShell — ?deploymentId= survives hash navigation', () => {
  /**
   * Regression: onContinue / onBack / step-indicator clicks spread the React `location`
   * state (stale closure) when pushing/replacing the hash. If persistDeploymentId wrote
   * ?deploymentId= to the URL via history.replace() just before onContinue fired, the
   * shell's history.push({ ...location, hash }) would use the old location (no search
   * param) and silently wipe the deployment id from the URL.
   *
   * Fixed by reading history.location (the live imperative value) instead.
   */
  it('preserves ?deploymentId= in the URL when onContinue advances from authenticate-and-deploy to detect-and-review', async () => {
    const { history } = renderShell('#authenticate-and-deploy');

    // Simulate persistDeploymentId: history.replace with the deployment id in search,
    // keeping the current hash — exactly what useOnboardingSO.persistDeploymentId does.
    act(() => {
      history.replace({
        ...history.location,
        search: '?deploymentId=test-deployment-id',
      });
    });

    expect(history.location.search).toBe('?deploymentId=test-deployment-id');

    // onContinue fires (the deploy settled and the step advances to detect-and-review).
    act(() => screen.getByTestId('authenticateAndDeployStep-continue').click());

    expect(history.location.hash).toBe('#detect-and-review');
    // The deployment id must survive the hash update.
    expect(history.location.search).toBe('?deploymentId=test-deployment-id');
  });

  it('preserves ?deploymentId= when navigating back from detect-and-review', async () => {
    const { history } = renderShell('#authenticate-and-deploy');

    act(() => {
      history.replace({ ...history.location, search: '?deploymentId=test-deployment-id' });
    });

    // Advance to detect-and-review, then navigate back.
    act(() => screen.getByTestId('authenticateAndDeployStep-continue').click());
    expect(history.location.hash).toBe('#detect-and-review');

    // Click the step indicator for authenticate-and-deploy (a completed step — clickable).
    act(() => screen.getByTestId('onboardingStepIndicator-authenticate-and-deploy').click());

    expect(history.location.hash).toBe('#authenticate-and-deploy');
    expect(history.location.search).toBe('?deploymentId=test-deployment-id');
  });
});

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

describe('OnboardingShell — provider metadata', () => {
  function renderAt(path: string) {
    const history = createMemoryHistory({ initialEntries: [path] });
    render(
      <I18nProvider>
        <OnboardingFlowProvider>
          <Router history={history}>
            <Route path="/:integrationId">
              <OnboardingShell />
            </Route>
          </Router>
        </OnboardingFlowProvider>
      </I18nProvider>
    );
    return history;
  }

  it('renders the AWS title and description from the provider registry', () => {
    renderAt('/aws#services');

    expect(screen.getByRole('heading', { name: AWS_ONBOARDING_TITLE })).toBeInTheDocument();
    expect(screen.getByText(AWS_ONBOARDING_DESCRIPTION)).toBeInTheDocument();
  });

  it('redirects to the root and renders nothing for an unsupported integration id', () => {
    const history = renderAt('/unknown#services');

    expect(history.location.pathname).toBe('/');
    expect(screen.queryByTestId('onboardingShell')).not.toBeInTheDocument();
  });
});

describe('OnboardingShell — cancelling the flow from the first step', () => {
  const navigateToUrl = jest.fn();
  const navigateToApp = jest.fn();

  function renderAt(path: string) {
    const history = createMemoryHistory({ initialEntries: [path] });
    render(
      <I18nProvider>
        <KibanaContextProvider services={{ application: { navigateToUrl, navigateToApp } }}>
          <OnboardingFlowProvider>
            <Router history={history}>
              <Route path="/:integrationId">
                <OnboardingShell />
              </Route>
            </Router>
          </OnboardingFlowProvider>
        </KibanaContextProvider>
      </I18nProvider>
    );
    return history;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('offers Back on the first step only', () => {
    const history = renderAt('/aws#services');
    expect(screen.getByTestId('servicesStep-back')).toBeInTheDocument();

    act(() => history.push('/aws#service-settings'));
    expect(screen.queryByTestId('servicesStep-back')).not.toBeInTheDocument();
  });

  it('asks for confirmation that changes are lost before cancelling', () => {
    renderAt('/aws#services');
    expect(screen.queryByTestId('onboardingCancelModal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('servicesStep-back'));

    expect(screen.getByTestId('onboardingCancelModal')).toHaveTextContent(
      'Your changes will be lost if you cancel the flow.'
    );
    expect(navigateToUrl).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('says the deployed services stay when the flow is resumed with ?deploymentId=', () => {
    renderAt('/aws?deploymentId=dep-1#services');
    fireEvent.click(screen.getByTestId('servicesStep-back'));

    const modal = screen.getByTestId('onboardingCancelModal');
    expect(modal).toHaveTextContent('Leave onboarding?');
    expect(modal).toHaveTextContent('Your deployed services stay in place.');
    expect(modal).not.toHaveTextContent('Your changes will be lost if you cancel the flow.');
    expect(screen.getByTestId('confirmModalConfirmButton')).toHaveTextContent('Leave onboarding');
  });

  it('keeps the plain wording while nothing is deployed', () => {
    renderAt('/aws#services');
    fireEvent.click(screen.getByTestId('servicesStep-back'));

    expect(screen.getByTestId('onboardingCancelModal')).toHaveTextContent('Cancel onboarding?');
    expect(screen.getByTestId('confirmModalConfirmButton')).toHaveTextContent('Cancel onboarding');
  });

  it('stays in the flow when the user keeps editing', () => {
    renderAt('/aws#services');
    fireEvent.click(screen.getByTestId('servicesStep-back'));
    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(screen.queryByTestId('onboardingCancelModal')).not.toBeInTheDocument();
    expect(navigateToUrl).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();
    expect(screen.getByTestId('servicesStep-continue')).toBeInTheDocument();
  });

  it('returns to the page the flow was opened from and drops the session once the app unmounts', () => {
    sessionStorage.setItem('onboarding.aws.returnUrl', '/app/integrations/browse?q=aws');
    sessionStorage.setItem('onboarding.aws.stepState', '{"services":"complete"}');
    renderAt('/aws#services');

    fireEvent.click(screen.getByTestId('servicesStep-back'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(navigateToUrl).toHaveBeenCalledWith('/app/integrations/browse?q=aws');
    // Still there: clearing now would be undone by the mounted persistence hooks.
    expect(sessionStorage.getItem('onboarding.aws.stepState')).not.toBeNull();

    // What the app does after it has unmounted.
    discardMarkedSessions();
    expect(sessionStorage.getItem('onboarding.aws.stepState')).toBeNull();
    expect(sessionStorage.getItem('onboarding.aws.returnUrl')).toBeNull();
  });

  it('falls back to the integrations app when there is no return url', () => {
    renderAt('/aws#services');
    fireEvent.click(screen.getByTestId('servicesStep-back'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(navigateToApp).toHaveBeenCalledWith('integrations');
    expect(navigateToUrl).not.toHaveBeenCalled();
  });
});
