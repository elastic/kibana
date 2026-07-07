/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Streams } from '@kbn/streams-schema';
import {
  CLOUD_SUBSCRIPTION_FEATURES_URL,
  CONTACT_US_URL,
  DefaultSnapshotRepositoryRequiredModal,
  EnterpriseGatingModal,
  SUBSCRIPTION_FEATURES_URL,
} from '@kbn/data-lifecycle-phases';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useSnapshotRepositories } from './use_snapshot_repositories';

interface UseDlmFrozenPhaseGatingProps {
  definition: Streams.ingest.all.GetResponse;
  enabled: boolean;
  /**
   * Called when the "default snapshot repository required" gating modal is open and a default
   * repository becomes available (e.g. the user created one and hit Refresh). Lets the caller resume
   * the blocked action - adding the frozen phase and opening the flyout.
   */
  onFrozenGatingResolved?: () => void;
}

export interface DlmFrozenPhaseGating {
  /**
   * Whether the frozen option should be hidden entirely from the "Add data phase" popover.
   * Happens when there is no default repository and the user cannot create one.
   */
  excludeFrozen: boolean;
  /** Badge flags for the "Add data phase" popover (IlmPhaseSelect). */
  addPhaseBadges: {
    showEnterpriseLicenseRequiredBadge: boolean;
    showDefaultRepositoryRequiredBadge: boolean;
  };
  /** Props to spread into the EditDlmPhasesFlyout for the frozen gating callouts/links. */
  flyoutProps: {
    isMissingEnterpriseLicense: boolean;
    onUpgradeEnterprise: () => void;
    onMissingDefaultRepository?: () => void;
    onRefreshDefaultRepository: () => void;
    isRefreshingDefaultRepository: boolean;
    manageRepositoriesHref: string;
    createDefaultRepositoryHref?: string;
    defaultRepositoryName?: string;
  };
  /**
   * Returns `true` when adding the given phase should open a gating modal instead of the flyout
   * (i.e. the caller should NOT open the edit flyout). Returns `false` when the flyout should open.
   */
  handleAddPhaseGating: (phase: string) => boolean;
  /** The gating modals, rendered when active. */
  modals: React.ReactNode;
}

export const useDlmFrozenPhaseGating = ({
  definition,
  enabled,
  onFrozenGatingResolved,
}: UseDlmFrozenPhaseGatingProps): DlmFrozenPhaseGating => {
  const {
    core: { application },
    dependencies: {
      start: { licensing, cloud },
    },
  } = useKibana();

  const license = useObservable(licensing.license$);
  // `license` is `undefined` until the licensing observable emits. Treat that as "still loading"
  // rather than "no enterprise" to avoid showing incorrect badges or triggering the gating modal
  // on the very first render before the license state is known.
  const isLicenseLoading = license === undefined;
  const hasEnterpriseLicense = !isLicenseLoading && Boolean(license?.hasAtLeast('enterprise'));

  const {
    defaultRepository,
    hasFetched: hasRepositoryFetched,
    isLoading: isRefreshingDefaultRepository,
    refresh: refreshSnapshotRepositories,
  } = useSnapshotRepositories({ enabled });

  const hasDefaultRepository = Boolean(defaultRepository);
  const isRepositoriesLoading = enabled && !hasRepositoryFetched;
  const canCreateRepository = Boolean(definition.privileges.create_snapshot_repository);

  const manageRepositoriesHref = application.getUrlForApp('management', {
    path: 'data/snapshot_restore/repositories',
  });
  const createDefaultRepositoryUrl = application.getUrlForApp('management', {
    path: 'data/snapshot_restore/add_repository',
  });

  const [activeModal, setActiveModal] = useState<'enterprise' | 'defaultRepository' | undefined>();
  const closeModal = useCallback(() => setActiveModal(undefined), []);

  // Resume the blocked "add frozen phase" flow once a default repository is detected while the
  // gating modal is open (e.g. the user created one and clicked Refresh). Close the modal and let
  // the caller open the flyout.
  useEffect(() => {
    if (activeModal === 'defaultRepository' && hasDefaultRepository) {
      setActiveModal(undefined);
      onFrozenGatingResolved?.();
    }
  }, [activeModal, hasDefaultRepository, onFrozenGatingResolved]);

  const onUpgradeEnterprise = useCallback(() => setActiveModal('enterprise'), []);
  const onMissingDefaultRepository = useCallback(() => {
    if (!canCreateRepository) {
      return;
    }
    setActiveModal('defaultRepository');
  }, [canCreateRepository]);

  // Frozen is omitted from the popover only when the user has no way to use it: no default
  // repository configured and no permission to create one.
  const excludeFrozen = !hasDefaultRepository && !canCreateRepository;

  const handleAddPhaseGating = useCallback(
    (phase: string): boolean => {
      if (phase !== 'frozen') {
        return false;
      }
      // If license or repository state hasn't loaded yet, block the flyout without opening a modal.
      // The user can retry once loading completes (typically within one render cycle).
      if (isLicenseLoading || isRepositoriesLoading) {
        return true;
      }
      if (!hasEnterpriseLicense) {
        setActiveModal('enterprise');
        return true;
      }
      if (!hasDefaultRepository) {
        if (canCreateRepository) {
          setActiveModal('defaultRepository');
        }
        return true;
      }
      return false;
    },
    [
      canCreateRepository,
      hasDefaultRepository,
      hasEnterpriseLicense,
      isLicenseLoading,
      isRepositoriesLoading,
    ]
  );

  const modals = (
    <>
      {activeModal === 'enterprise' && (
        <EnterpriseGatingModal
          environment={cloud?.isCloudEnabled ? 'cloud' : 'selfManaged'}
          hasManageSubscriptionPermission={
            cloud?.isCloudEnabled
              ? true
              : Boolean(application.capabilities?.management?.stack?.license_management)
          }
          trialStatus={cloud?.trialDaysLeft?.() === 0 ? 'expired' : 'notStarted'}
          subscriptionFeaturesUrl={
            cloud?.isCloudEnabled ? CLOUD_SUBSCRIPTION_FEATURES_URL : SUBSCRIPTION_FEATURES_URL
          }
          onPrimaryAction={
            cloud?.isCloudEnabled
              ? undefined
              : () => window.open(CONTACT_US_URL, '_blank', 'noopener')
          }
          onCancel={closeModal}
          data-test-subj="streamsDlmFrozenEnterpriseGatingModal"
        />
      )}

      {activeModal === 'defaultRepository' && (
        <DefaultSnapshotRepositoryRequiredModal
          createDefaultRepositoryUrl={createDefaultRepositoryUrl}
          isRefreshing={isRefreshingDefaultRepository}
          onRefresh={refreshSnapshotRepositories}
          onCancel={closeModal}
          data-test-subj="streamsDlmFrozenDefaultRepositoryRequiredModal"
        />
      )}
    </>
  );

  return {
    excludeFrozen,
    addPhaseBadges: {
      // Suppress badges while loading to avoid flickering the wrong state on first render.
      showEnterpriseLicenseRequiredBadge: !isLicenseLoading && !hasEnterpriseLicense,
      showDefaultRepositoryRequiredBadge:
        !isLicenseLoading &&
        !isRepositoriesLoading &&
        hasEnterpriseLicense &&
        !hasDefaultRepository,
    },
    flyoutProps: {
      isMissingEnterpriseLicense: !hasEnterpriseLicense,
      onUpgradeEnterprise,
      onMissingDefaultRepository: canCreateRepository ? onMissingDefaultRepository : undefined,
      onRefreshDefaultRepository: refreshSnapshotRepositories,
      isRefreshingDefaultRepository,
      manageRepositoriesHref,
      // Only surface the create-repository link when the user actually has permission to create one.
      createDefaultRepositoryHref: canCreateRepository ? createDefaultRepositoryUrl : undefined,
      defaultRepositoryName: defaultRepository,
    },
    handleAddPhaseGating,
    modals,
  };
};
