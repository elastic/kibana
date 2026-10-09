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

import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  useGetPackageInfoByKeyQuery,
  getAnyCloudConnectorIacTemplateUrl,
  LazyAwsIdentityFederationSetup,
  LazyAwsStaticKeysForm,
} from '@kbn/fleet-plugin/public';

const mockUseKibana = useKibana as jest.Mock;
const mockUseGetPackageInfoByKeyQuery = useGetPackageInfoByKeyQuery as jest.Mock;
const mockGetAnyCloudConnectorIacTemplateUrl = getAnyCloudConnectorIacTemplateUrl as jest.Mock;
const MockIdentityFederation = LazyAwsIdentityFederationSetup as unknown as jest.Mock;
const MockStaticKeys = LazyAwsStaticKeysForm as unknown as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { ManagedIntegrationsSection } from './managed_integrations_section';

function setupMocks({ cloud = undefined }: { cloud?: object } = {}) {
  mockUseKibana.mockReturnValue({ services: { cloud } });
  mockUseGetPackageInfoByKeyQuery.mockReturnValue({ data: undefined });
  mockGetAnyCloudConnectorIacTemplateUrl.mockReturnValue(undefined);

  MockIdentityFederation.mockImplementation(
    ({ onReadyChange }: { onReadyChange?: (v: boolean) => void }) => (
      <div data-test-subj="identity-federation">
        <button onClick={() => onReadyChange?.(true)}>mark-ready</button>
        <button onClick={() => onReadyChange?.(false)}>mark-not-ready</button>
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

function renderSection(props: { serviceCount?: number; showIdentityFederation?: boolean } = {}) {
  return render(
    <I18nProvider>
      <React.Suspense fallback={<div>Loading...</div>}>
        <ManagedIntegrationsSection
          serviceCount={props.serviceCount ?? 3}
          showIdentityFederation={props.showIdentityFederation ?? true}
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
