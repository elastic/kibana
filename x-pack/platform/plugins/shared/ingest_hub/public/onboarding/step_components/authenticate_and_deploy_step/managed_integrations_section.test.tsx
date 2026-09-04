/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/fleet-plugin/public', () => ({
  useGetPackageInfoByKeyQuery: jest.fn(),
  getAnyCloudConnectorIacTemplateUrl: jest.fn(),
  // Render as a simple div so we can fire onReadyChange without real fleet internals
  LazyAwsIdentityFederationSetup: jest.fn(),
  LazyAwsStaticKeysForm: jest.fn(),
}));

jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  useGetPackageInfoByKeyQuery,
  getAnyCloudConnectorIacTemplateUrl,
  LazyAwsIdentityFederationSetup,
  LazyAwsStaticKeysForm,
} from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';

const mockUseKibana = useKibana as jest.Mock;
const mockUseGetPackageInfoByKeyQuery = useGetPackageInfoByKeyQuery as jest.Mock;
const mockGetAnyCloudConnectorIacTemplateUrl = getAnyCloudConnectorIacTemplateUrl as jest.Mock;
const MockIdentityFederation = LazyAwsIdentityFederationSetup as unknown as jest.Mock;
const MockStaticKeys = LazyAwsStaticKeysForm as unknown as jest.Mock;
const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { ManagedIntegrationsSection } from './managed_integrations_section';

function setupMocks({
  cloud = undefined,
  setConnectorId = jest.fn(),
}: { cloud?: object; setConnectorId?: jest.Mock } = {}) {
  mockUseKibana.mockReturnValue({ services: { cloud } });
  mockUseGetPackageInfoByKeyQuery.mockReturnValue({ data: undefined });
  mockGetAnyCloudConnectorIacTemplateUrl.mockReturnValue(undefined);
  mockUseOnboardingFlow.mockReturnValue({ setConnectorId });

  MockIdentityFederation.mockImplementation(
    ({
      onReadyChange,
      onConnectorIdChange,
    }: {
      onReadyChange?: (v: boolean) => void;
      onConnectorIdChange?: (id: string | undefined, name?: string) => void;
    }) => (
      <div data-test-subj="identity-federation">
        <button onClick={() => onReadyChange?.(true)}>mark-ready</button>
        <button onClick={() => onReadyChange?.(false)}>mark-not-ready</button>
        <button onClick={() => onConnectorIdChange?.('id-1', 'my-connector')}>mark-named</button>
      </div>
    )
  );

  MockStaticKeys.mockImplementation(
    ({ onReadyChange }: { onReadyChange?: (v: boolean) => void }) => (
      <div data-test-subj="static-keys">
        <button onClick={() => onReadyChange?.(true)}>mark-ready</button>
      </div>
    )
  );
}

function renderSection(
  props: {
    serviceCount?: number;
    showIdentityFederation?: boolean;
    onDeploy?: () => void;
    isDeploying?: boolean;
    isDone?: boolean;
    hasFailed?: boolean;
  } = {}
) {
  return render(
    <I18nProvider>
      <React.Suspense fallback={<div>Loading...</div>}>
        <ManagedIntegrationsSection
          serviceCount={props.serviceCount ?? 3}
          showIdentityFederation={props.showIdentityFederation ?? true}
          onDeploy={props.onDeploy ?? jest.fn()}
          isDeploying={props.isDeploying ?? false}
          isDone={props.isDone ?? false}
          hasFailed={props.hasFailed ?? false}
        />
      </React.Suspense>
    </I18nProvider>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ManagedIntegrationsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('accordion toggle', () => {
    it('renders content open by default', () => {
      renderSection();
      expect(screen.getByTestId('identity-federation')).toBeInTheDocument();
    });

    it('hides content when header button is clicked', () => {
      renderSection();
      fireEvent.click(screen.getByTestId('managedIntegrationsSection-headerButton'));
      expect(screen.queryByTestId('identity-federation')).not.toBeInTheDocument();
    });

    it('reopens content on second header click', () => {
      renderSection();
      fireEvent.click(screen.getByTestId('managedIntegrationsSection-headerButton'));
      fireEvent.click(screen.getByTestId('managedIntegrationsSection-headerButton'));
      expect(screen.getByTestId('identity-federation')).toBeInTheDocument();
    });
  });

  describe('showIdentityFederation=true', () => {
    it('renders method radio group', () => {
      renderSection({ showIdentityFederation: true });
      expect(
        screen.getByTestId('managedIntegrationsSection-preferredMethodRadio')
      ).toBeInTheDocument();
    });

    it('shows identity federation form by default', () => {
      renderSection({ showIdentityFederation: true });
      expect(screen.getByTestId('identity-federation')).toBeInTheDocument();
      expect(screen.queryByTestId('static-keys')).not.toBeInTheDocument();
    });

    it('switches to access keys form when radio changes', () => {
      renderSection({ showIdentityFederation: true });
      const radio = screen.getByRole('radio', { name: /access keys/i });
      fireEvent.click(radio);
      expect(screen.getByTestId('static-keys')).toBeInTheDocument();
      expect(screen.queryByTestId('identity-federation')).not.toBeInTheDocument();
    });
  });

  describe('showIdentityFederation=false', () => {
    it('hides method radio group', () => {
      renderSection({ showIdentityFederation: false });
      expect(
        screen.queryByTestId('managedIntegrationsSection-preferredMethodRadio')
      ).not.toBeInTheDocument();
    });

    it('shows static keys form (default when identity federation hidden)', () => {
      renderSection({ showIdentityFederation: false });
      expect(screen.getByTestId('static-keys')).toBeInTheDocument();
    });
  });

  describe('Deploy button readiness', () => {
    it('Deploy button is disabled initially', () => {
      renderSection();
      expect(screen.getByTestId('managedIntegrationsSection-deployButton')).toBeDisabled();
    });

    it('Deploy button enables when fleet component calls onReadyChange(true)', () => {
      renderSection();
      act(() => {
        fireEvent.click(screen.getByText('mark-ready'));
      });
      expect(screen.getByTestId('managedIntegrationsSection-deployButton')).not.toBeDisabled();
    });

    it('Deploy button disables again when onReadyChange(false) fires', () => {
      renderSection();
      act(() => {
        fireEvent.click(screen.getByText('mark-ready'));
      });
      act(() => {
        fireEvent.click(screen.getByText('mark-not-ready'));
      });
      expect(screen.getByTestId('managedIntegrationsSection-deployButton')).toBeDisabled();
    });

    it('switching method resets Deploy button to disabled', () => {
      renderSection({ showIdentityFederation: true });
      // Enable via identity federation
      act(() => {
        fireEvent.click(screen.getByText('mark-ready'));
      });
      expect(screen.getByTestId('managedIntegrationsSection-deployButton')).not.toBeDisabled();

      // Switch to access keys — button must reset to disabled
      fireEvent.click(screen.getByRole('radio', { name: /access keys/i }));
      expect(screen.getByTestId('managedIntegrationsSection-deployButton')).toBeDisabled();
    });
  });

  describe('connector name propagation', () => {
    it('calls setConnectorId with id and name when identity federation fires onConnectorIdChange', () => {
      const setConnectorId = jest.fn();
      setupMocks({ setConnectorId });
      renderSection({ showIdentityFederation: true });
      act(() => {
        fireEvent.click(screen.getByText('mark-named'));
      });
      expect(setConnectorId).toHaveBeenCalledWith('id-1', 'my-connector');
    });

    it('calls setConnectorId(undefined) when switching to access keys', () => {
      const setConnectorId = jest.fn();
      setupMocks({ setConnectorId });
      renderSection({ showIdentityFederation: true });
      fireEvent.click(screen.getByRole('radio', { name: /access keys/i }));
      expect(setConnectorId).toHaveBeenCalledWith(undefined);
    });
  });

  describe('deploy button interaction', () => {
    it('calls onDeploy when clicked after credentials ready', () => {
      const onDeploy = jest.fn();
      renderSection({ onDeploy });
      act(() => {
        fireEvent.click(screen.getByText('mark-ready'));
      });
      fireEvent.click(screen.getByTestId('managedIntegrationsSection-deployButton'));
      expect(onDeploy).toHaveBeenCalledTimes(1);
    });
  });

  describe('deploying state', () => {
    it('shows loading button while isDeploying', () => {
      renderSection({ isDeploying: true });
      const btn = screen.getByTestId('managedIntegrationsSection-deployButton');
      expect(btn).toBeDisabled();
      expect(screen.getByText('Deploying integrations...')).toBeInTheDocument();
    });
  });

  describe('failed state', () => {
    it('shows error callout when hasFailed', () => {
      renderSection({ hasFailed: true });
      expect(screen.getByTestId('managedIntegrationsSection-errorCallout')).toBeInTheDocument();
    });

    it('hides deploy button when hasFailed', () => {
      renderSection({ hasFailed: true });
      expect(
        screen.queryByTestId('managedIntegrationsSection-deployButton')
      ).not.toBeInTheDocument();
    });

    it('calls onDeploy when Retry clicked', () => {
      const onDeploy = jest.fn();
      renderSection({ hasFailed: true, onDeploy });
      fireEvent.click(screen.getByTestId('managedIntegrationsSection-retryButton'));
      expect(onDeploy).toHaveBeenCalledTimes(1);
    });

    it('hides callout while isDeploying (retry in flight)', () => {
      renderSection({ hasFailed: true, isDeploying: true });
      expect(
        screen.queryByTestId('managedIntegrationsSection-errorCallout')
      ).not.toBeInTheDocument();
    });
  });

  describe('done state', () => {
    it('auto-collapses section when isDone', () => {
      const { rerender } = renderSection({ isDone: false });
      expect(screen.getByTestId('identity-federation')).toBeInTheDocument();
      act(() => {
        rerender(
          <I18nProvider>
            <React.Suspense fallback={<div>Loading...</div>}>
              <ManagedIntegrationsSection
                serviceCount={3}
                showIdentityFederation={true}
                onDeploy={jest.fn()}
                isDeploying={false}
                isDone={true}
                hasFailed={false}
              />
            </React.Suspense>
          </I18nProvider>
        );
      });
      expect(screen.queryByTestId('identity-federation')).not.toBeInTheDocument();
    });

    it('shows Done badge in header when isDone', () => {
      renderSection({ isDone: true });
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('deploy button is absent when isDone', () => {
      renderSection({ isDone: true });
      fireEvent.click(screen.getByTestId('managedIntegrationsSection-headerButton'));
      expect(
        screen.queryByTestId('managedIntegrationsSection-deployButton')
      ).not.toBeInTheDocument();
    });

    it('shows success message when isDone and section is open', () => {
      renderSection({ isDone: true });
      fireEvent.click(screen.getByTestId('managedIntegrationsSection-headerButton'));
      expect(screen.getByTestId('managedIntegrationsSection-successMessage')).toBeInTheDocument();
    });
  });

  describe('service count badge', () => {
    it('renders singular "service" label for count 1', () => {
      renderSection({ serviceCount: 1 });
      expect(screen.getByText('1 service')).toBeInTheDocument();
    });

    it('renders plural "services" label for count > 1', () => {
      renderSection({ serviceCount: 5 });
      expect(screen.getByText('5 services')).toBeInTheDocument();
    });
  });
});
