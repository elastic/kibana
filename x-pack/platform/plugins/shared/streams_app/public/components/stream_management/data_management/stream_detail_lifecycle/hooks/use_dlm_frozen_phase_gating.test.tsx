/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { Streams } from '@kbn/streams-schema';
import { useDlmFrozenPhaseGating } from './use_dlm_frozen_phase_gating';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

// Controlled mocks shared with the jest.mock factories below (must be `mock`-prefixed).
let mockLicense: { hasAtLeast: (level: string) => boolean } | undefined;
let mockCloud: { isCloudEnabled?: boolean; trialDaysLeft?: () => number | undefined } | undefined;
let mockLicenseManagementCapable = true;
const mockGetUrlForApp = jest.fn(
  (app: string, opts?: { path?: string }) => `/app/${app}/${opts?.path ?? ''}`
);

const mockUseSnapshotRepositories = jest.fn();

jest.mock('react-use/lib/useObservable', () => ({
  __esModule: true,
  default: () => mockLicense,
}));

jest.mock('./use_snapshot_repositories', () => ({
  useSnapshotRepositories: (...args: unknown[]) => mockUseSnapshotRepositories(...args),
}));

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      application: {
        getUrlForApp: mockGetUrlForApp,
        capabilities: {
          management: { stack: { license_management: mockLicenseManagementCapable } },
        },
      },
    },
    dependencies: {
      start: {
        licensing: { license$: {} },
        cloud: mockCloud,
      },
    },
  }),
}));

const createDefinition = (canCreateSnapshotRepository: boolean): Streams.ingest.all.GetResponse =>
  ({
    privileges: { create_snapshot_repository: canCreateSnapshotRepository },
  } as unknown as Streams.ingest.all.GetResponse);

const setSnapshotRepositories = (defaultRepository?: string, repositories?: string[]) => {
  mockUseSnapshotRepositories.mockReturnValue({
    defaultRepository,
    repositories: repositories ?? (defaultRepository ? [defaultRepository] : []),
    isLoading: false,
    hasFetched: true,
    error: null,
    refresh: jest.fn(),
  });
};

const renderGating = (canCreateSnapshotRepository = true) =>
  renderHook(() =>
    useDlmFrozenPhaseGating({
      definition: createDefinition(canCreateSnapshotRepository),
      enabled: true,
    })
  );

describe('useDlmFrozenPhaseGating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLicense = { hasAtLeast: () => true };
    mockCloud = { isCloudEnabled: false, trialDaysLeft: () => undefined };
    mockLicenseManagementCapable = true;
    setSnapshotRepositories('found-snapshots');
  });

  it('forwards the `enabled` flag to useSnapshotRepositories', () => {
    renderHook(() =>
      useDlmFrozenPhaseGating({ definition: createDefinition(true), enabled: false })
    );
    expect(mockUseSnapshotRepositories).toHaveBeenCalledWith({ enabled: false });
  });

  describe('when the requirements are met (enterprise license + default repository)', () => {
    it('shows no badges, does not exclude frozen and opens the flyout for any phase', () => {
      const { result } = renderGating();

      expect(result.current.excludeFrozen).toBe(false);
      expect(result.current.addPhaseBadges).toEqual({
        showEnterpriseLicenseRequiredBadge: false,
        showDefaultRepositoryRequiredBadge: false,
      });
      // false => the caller should open the edit flyout (no gating modal).
      expect(result.current.handleAddPhaseGating('frozen')).toBe(false);
      expect(result.current.handleAddPhaseGating('delete')).toBe(false);

      expect(result.current.flyoutProps.isMissingEnterpriseLicense).toBe(false);
      expect(result.current.flyoutProps.defaultRepositoryName).toBe('found-snapshots');
      expect(result.current.flyoutProps.manageRepositoriesHref).toContain(
        'snapshot_restore/repositories'
      );
    });
  });

  describe('when the enterprise license is missing', () => {
    beforeEach(() => {
      mockLicense = { hasAtLeast: () => false };
    });

    it('surfaces the enterprise badge and gates the frozen phase behind the enterprise modal', () => {
      const { result } = renderGating();

      expect(result.current.addPhaseBadges.showEnterpriseLicenseRequiredBadge).toBe(true);
      // Repository badge is only shown once the license requirement is satisfied.
      expect(result.current.addPhaseBadges.showDefaultRepositoryRequiredBadge).toBe(false);
      expect(result.current.flyoutProps.isMissingEnterpriseLicense).toBe(true);

      // delete is never gated.
      expect(result.current.handleAddPhaseGating('delete')).toBe(false);

      act(() => {
        // true => a gating modal was opened, the caller must not open the flyout.
        expect(result.current.handleAddPhaseGating('frozen')).toBe(true);
      });

      renderWithI18n(<>{result.current.modals}</>);
      expect(
        document.querySelector('[data-test-subj="streamsDlmFrozenEnterpriseGatingModal"]')
      ).toBeTruthy();
    });
  });

  describe('when the default repository is missing but the user can create one', () => {
    beforeEach(() => {
      setSnapshotRepositories(undefined);
    });

    it('surfaces the repository badge and gates the frozen phase behind the repository modal', () => {
      const { result } = renderGating(true);

      expect(result.current.excludeFrozen).toBe(false);
      expect(result.current.addPhaseBadges.showDefaultRepositoryRequiredBadge).toBe(true);
      expect(result.current.flyoutProps.defaultRepositoryName).toBeUndefined();
      expect(result.current.flyoutProps.onMissingDefaultRepository).toBeDefined();

      act(() => {
        expect(result.current.handleAddPhaseGating('frozen')).toBe(true);
      });

      renderWithI18n(<>{result.current.modals}</>);
      expect(
        document.querySelector(
          '[data-test-subj="streamsDlmFrozenDefaultRepositoryRequiredModalTitle"]'
        )
      ).toBeTruthy();
      // With no existing repositories the modal directs the user to create a default one.
      expect(
        document.querySelector(
          '[data-test-subj="streamsDlmFrozenDefaultRepositoryRequiredModalCreateDefaultRepositoryButton"]'
        )
      ).toBeTruthy();
      expect(
        document.querySelector(
          '[data-test-subj="streamsDlmFrozenDefaultRepositoryRequiredModalManageRepositoriesButton"]'
        )
      ).toBeNull();
    });

    it('directs the user to the repositories list when other repositories already exist', () => {
      // A repository exists but none is configured as the default.
      setSnapshotRepositories(undefined, ['existing-repo']);
      const { result } = renderGating(true);

      act(() => {
        expect(result.current.handleAddPhaseGating('frozen')).toBe(true);
      });

      renderWithI18n(<>{result.current.modals}</>);
      const manageButton = document.querySelector(
        '[data-test-subj="streamsDlmFrozenDefaultRepositoryRequiredModalManageRepositoriesButton"]'
      );
      expect(manageButton).toBeTruthy();
      expect(manageButton?.getAttribute('href')).toContain('snapshot_restore/repositories');
      expect(
        document.querySelector(
          '[data-test-subj="streamsDlmFrozenDefaultRepositoryRequiredModalCreateDefaultRepositoryButton"]'
        )
      ).toBeNull();
      expect(result.current.flyoutProps.hasExistingRepositories).toBe(true);
    });
  });

  describe('when the default repository is missing and the user cannot create one', () => {
    beforeEach(() => {
      setSnapshotRepositories(undefined);
    });

    it('excludes frozen from the popover and does not expose a create-repository action', () => {
      const { result } = renderGating(false);

      expect(result.current.excludeFrozen).toBe(true);
      expect(result.current.flyoutProps.onMissingDefaultRepository).toBeUndefined();

      // Gating still blocks opening the flyout, but no modal is shown (nothing the user can do).
      act(() => {
        expect(result.current.handleAddPhaseGating('frozen')).toBe(true);
      });

      renderWithI18n(<>{result.current.modals}</>);
      expect(
        document.querySelector(
          '[data-test-subj="streamsDlmFrozenDefaultRepositoryRequiredModalTitle"]'
        )
      ).toBeNull();
    });
  });

  describe('resuming the frozen flow after the default repository is configured', () => {
    it('closes the gating modal and calls onFrozenGatingResolved once a default repository appears', () => {
      setSnapshotRepositories(undefined);
      const onFrozenGatingResolved = jest.fn();
      const { result, rerender } = renderHook(() =>
        useDlmFrozenPhaseGating({
          definition: createDefinition(true),
          enabled: true,
          onFrozenGatingResolved,
        })
      );

      // Adding frozen with no default repository blocks the flyout and opens the gating modal.
      let blocked: boolean | undefined;
      act(() => {
        blocked = result.current.handleAddPhaseGating('frozen');
      });
      expect(blocked).toBe(true);
      expect(onFrozenGatingResolved).not.toHaveBeenCalled();

      // The user creates a repository and hits Refresh → a default repository is now detected.
      setSnapshotRepositories('brand-new-repo');
      rerender();

      // The blocked flow resumes: the caller is asked to reopen the flyout and gating no longer blocks.
      expect(onFrozenGatingResolved).toHaveBeenCalledTimes(1);
      expect(result.current.handleAddPhaseGating('frozen')).toBe(false);
    });

    it('does not call onFrozenGatingResolved when no gating modal is open', () => {
      const onFrozenGatingResolved = jest.fn();
      const { rerender } = renderHook(() =>
        useDlmFrozenPhaseGating({
          definition: createDefinition(true),
          enabled: true,
          onFrozenGatingResolved,
        })
      );

      // Repository availability changing on its own (no pending "add frozen") must not resume anything.
      setSnapshotRepositories('brand-new-repo');
      rerender();

      expect(onFrozenGatingResolved).not.toHaveBeenCalled();
    });
  });
});
