/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCheckbox,
  EuiCallOut,
  EuiConfirmModal,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { toMountPoint } from '@kbn/react-kibana-mount';

import type { FleetStartServices } from '../../../../../../../plugin';
import type {
  PackageInfo,
  UpgradePackagePolicyDryRunResponse,
  PackagePolicy,
} from '../../../../../types';
import type { AgentlessPolicyUpgradeDryRunResponse } from '../../../../../../../../common/types/rest_spec/agentless_policy';
import { InstallStatus } from '../../../../../types';
import {
  useInstallPackage,
  useGetPackageInstallStatus,
  useStartServices,
  useAuthz,
  useLink,
  useUpgradePackagePoliciesMutation,
  useBulkGetAgentPoliciesQuery,
  sendBulkUpgradeAgentlessPolicies,
} from '../../../../../hooks';

interface UpdateButtonProps extends Pick<PackageInfo, 'name' | 'title' | 'version'> {
  dryRunData?: UpgradePackagePolicyDryRunResponse | null;
  agentlessDryRunData?: AgentlessPolicyUpgradeDryRunResponse | null;
  packagePolicyIds?: string[];
  agentlessPolicyIds?: string[];
  agentPolicyIds: string[];
  isUpgradingPackagePolicies?: boolean;
  setIsUpgradingPackagePolicies?: React.Dispatch<React.SetStateAction<boolean>>;
  startServices: Pick<FleetStartServices, 'analytics' | 'i18n' | 'theme'>;
  isDisabled?: boolean;
}

/*

  Updating an integration to a new version entails a bit of logic. We allow the user to choose whether they'd like to
  simultaneously upgrade any package policies that include the current version of the integration. For example, if
  a user is running four agent policies that include the `nginx-0.2.4` package and they update to `nginx-0.7.0`, they
  can elect to also deploy the new integration version to any agent running one of those four agent policies.

  If the user does not elect to upgrade their running policies, we simply install the latest version of the package and
  navigate to the new version's settings page, e.g. `/detail/nginx-0.7.0/settings`.

  If the user _does_ elect to upgrade their running policies, we display a confirmation modal. In this modal, we'll report the
  number of agents and policies that will be affected by the upgrade, and if there are any conflicts. In the case of a conflict
  between versions, an upgrade for a given package policy will be skipped and the user will need to manually recreate their policy
  to resolve any breaking changes between versions. Once the user confirms, we first install the latest version of the integration,
  then we make a call to the "upgrade policies" API endpoint with a list of all package policy ID's that include the current version
  of the integration. This API endpoint will complete the upgrade process in bulk for each package policy provided. Upon completion,
  we navigate to the new version's settings page, as above.

*/

export const UpdateButton: React.FunctionComponent<UpdateButtonProps> = ({
  dryRunData,
  agentlessDryRunData,
  isUpgradingPackagePolicies = false,
  name,
  packagePolicyIds = [],
  agentlessPolicyIds = [],
  agentPolicyIds = [],
  setIsUpgradingPackagePolicies = () => {},
  title,
  version,
  startServices,
  isDisabled = false,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  const history = useHistory();
  const { getPath } = useLink();

  const { notifications } = useStartServices();
  const canUpgradePackages = useAuthz().integrations.upgradePackages;

  const installPackage = useInstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(name);
  const isInstalling = installationStatus === InstallStatus.installing;

  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState<boolean>(false);
  const [upgradePackagePolicies, setUpgradePackagePolicies] = useState<boolean>(true);

  const { data: agentPolicyData } = useBulkGetAgentPoliciesQuery(agentPolicyIds, { full: true });

  const agentBasedPolicyCount = packagePolicyIds.length;
  const agentlessPolicyCount = agentlessPolicyIds.length;
  const totalPolicyCount = agentBasedPolicyCount + agentlessPolicyCount;
  // Only break the count down by deployment mode when the integration actually has both kinds.
  const hasMixedPolicyTypes = agentBasedPolicyCount > 0 && agentlessPolicyCount > 0;

  function isStringArray(arr: unknown | string[]): arr is string[] {
    return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
  }

  // Count agents across both agent-based and agentless policies for this integration.
  const allPolicyIds = useMemo(
    () => [...packagePolicyIds, ...agentlessPolicyIds],
    [packagePolicyIds, agentlessPolicyIds]
  );

  const agentCount = useMemo(() => {
    if (!agentPolicyData?.items) return 0;

    return agentPolicyData.items.reduce((acc, item) => {
      const existingPolicies = item?.package_policies
        ? isStringArray(item.package_policies)
          ? (item.package_policies as string[]).filter((p) => allPolicyIds.includes(p))
          : (item.package_policies as PackagePolicy[]).filter((p) => allPolicyIds.includes(p.id))
        : [];
      return (acc += existingPolicies.length > 0 && item?.agents ? item?.agents : 0);
    }, 0);
  }, [agentPolicyData, allPolicyIds]);

  const conflictCount = useMemo(() => {
    const packagePolicyConflicts = dryRunData?.filter((item) => item.hasErrors).length ?? 0;
    // For agentless, `hasErrors` covers both config-migration conflicts (carry `errors`) and
    // guard failures (carry `statusCode`, e.g. a policy deleted mid-flight). Only the former is a
    // real "conflict" the user resolves; guard failures are excluded from the conflict count.
    const agentlessConflicts =
      agentlessDryRunData?.filter((item) => item.hasErrors && item.statusCode === undefined)
        .length ?? 0;
    return packagePolicyConflicts + agentlessConflicts;
  }, [dryRunData, agentlessDryRunData]);

  const handleUpgradePackagePoliciesChange = useCallback(() => {
    setUpgradePackagePolicies((prev) => !prev);
  }, []);

  const navigateToNewSettingsPage = useCallback(() => {
    // only navigate if still on old settings page (user has not navigated away)
    if (
      !history.location.pathname.match(
        getPath('integration_details_settings', {
          pkgkey: `${name}-.*`,
        })
      )
    ) {
      return;
    }
    const settingsPath = getPath('integration_details_settings', {
      pkgkey: `${name}-${version}`,
    });
    history.push(settingsPath);
  }, [history, getPath, name, version]);

  const handleClickUpdate = useCallback(async () => {
    await installPackage({ name, version, title, isUpgrade: true });
    navigateToNewSettingsPage();
  }, [installPackage, name, title, version, navigateToNewSettingsPage]);

  const upgradePackagePoliciesMutation = useUpgradePackagePoliciesMutation();

  const handleClickUpgradePolicies = useCallback(async () => {
    if (isUpgradingPackagePolicies) {
      return;
    }

    setIsUpdateModalVisible(false);
    setIsUpgradingPackagePolicies(true);

    const hasUpgraded = await installPackage({ name, version, title, isUpgrade: true });
    //  If install package failed do not upgrade package policies
    if (!hasUpgraded) {
      setIsUpgradingPackagePolicies(false);
      return;
    }

    // Only upgrade agent-based policies that don't have conflicts (package-policy dry-run shape:
    // conflicts are keyed by the nested `diff[0].id`).
    const packagePolicyIdsToUpdate = packagePolicyIds.filter(
      (id) => !dryRunData?.find((dryRunRecord) => dryRunRecord.diff?.[0].id === id)?.hasErrors
    );

    // Agentless policies upgrade through the agentless API. The agentless dry-run shape exposes a
    // top-level `id`/`hasErrors`, so conflicts are matched directly by id.
    const agentlessIdsToUpgrade = agentlessPolicyIds.filter(
      (id) => !agentlessDryRunData?.find((dryRunRecord) => dryRunRecord.id === id)?.hasErrors
    );

    // Guard failures (dry-run entries with a `statusCode`, e.g. a policy deleted mid-flight or an
    // API error while checking it) are excluded from the upgrade set like conflicts, but they are
    // not announced in the confirm modal's conflict callout — they are not user-resolvable config
    // conflicts. Announce the skip here so the success toast can't read as a full upgrade.
    const agentlessGuardFailures =
      agentlessDryRunData?.filter((item) => item.hasErrors && item.statusCode !== undefined) ?? [];
    if (agentlessGuardFailures.length > 0) {
      notifications.toasts.addWarning({
        title: i18n.translate(
          'xpack.fleet.integrations.settings.skippedAgentlessPoliciesToast.title',
          {
            defaultMessage:
              'Fleet skipped {skippedCount, plural, one {# managed integration} other {# managed integrations}}',
            values: { skippedCount: agentlessGuardFailures.length },
          }
        ),
        text: i18n.translate(
          'xpack.fleet.integrations.settings.skippedAgentlessPoliciesToast.message',
          {
            defaultMessage:
              'Fleet could not check {skippedNames} for upgrade. Upgrade {skippedCount, plural, one {it} other {them}} manually.',
            values: {
              skippedCount: agentlessGuardFailures.length,
              skippedNames: i18n.formatList(
                'conjunction',
                agentlessGuardFailures.map((item) => item.name ?? item.id)
              ),
            },
          }
        ),
      });
    }

    if (!packagePolicyIdsToUpdate.length && !agentlessIdsToUpgrade.length) {
      setIsUpgradingPackagePolicies(false);
      navigateToNewSettingsPage();
      return;
    }

    const upgradeAgentBasedPolicies = async (): Promise<void> => {
      if (!packagePolicyIdsToUpdate.length) {
        return;
      }
      try {
        await upgradePackagePoliciesMutation.mutateAsync({
          packagePolicyIds: packagePolicyIdsToUpdate,
        });
        notifications.toasts.addSuccess({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.packageUpdateSuccessTitle"
              defaultMessage="Updated {title} and upgraded agent-based policies"
              values={{ title }}
            />,
            startServices
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.packageUpdateSuccessDescription"
              defaultMessage="Fleet upgraded {agentBasedPolicyCount, plural, one {# agent-based policy} other {# agent-based policies}}."
              values={{ agentBasedPolicyCount: packagePolicyIdsToUpdate.length }}
            />,
            startServices
          ),
        });
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate(
            'xpack.fleet.integrations.settings.errorUpdatingPoliciesToast.title',
            {
              defaultMessage: 'Error upgrading agent-based policies',
            }
          ),
          toastMessage: i18n.translate(
            'xpack.fleet.integrations.settings.errorUpdatingPoliciesToast.message',
            {
              defaultMessage: 'Upgrade agent-based integration policies manually.\nError: {error}',
              values: {
                error: error.message,
              },
            }
          ),
        });
      }
    };

    const upgradeAgentlessPolicies = async (): Promise<void> => {
      if (!agentlessIdsToUpgrade.length) {
        return;
      }
      try {
        const results = await sendBulkUpgradeAgentlessPolicies(agentlessIdsToUpgrade);
        const failed = results.filter((result) => !result.success);
        if (failed.length > 0) {
          // The response carries per-policy failure details — surface them so the operator can
          // tell which policies failed and why, not just how many.
          const firstErrorMessage = failed.find((result) => result.body?.message)?.body?.message;
          notifications.toasts.addWarning({
            title: i18n.translate(
              'xpack.fleet.integrations.settings.errorUpdatingAgentlessPoliciesToast.title',
              {
                defaultMessage: 'Error upgrading managed integrations',
              }
            ),
            text: i18n.translate(
              'xpack.fleet.integrations.settings.errorUpdatingAgentlessPoliciesToast.message',
              {
                defaultMessage:
                  'Fleet could not upgrade {failedNames}. Upgrade {failedCount, plural, one {it} other {them}} manually.{errorMessage}',
                values: {
                  failedCount: failed.length,
                  failedNames: i18n.formatList(
                    'conjunction',
                    failed.map((result) => result.name ?? result.id)
                  ),
                  errorMessage: firstErrorMessage ? `\nError: ${firstErrorMessage}` : '',
                },
              }
            ),
          });
          // Partial failure: skip the success toast below.
          return;
        }
        notifications.toasts.addSuccess({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.agentlessPackageUpdateSuccessTitle"
              defaultMessage="Updated {title} and upgraded managed integrations"
              values={{ title }}
            />,
            startServices
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.agentlessPackageUpdateSuccessDescription"
              defaultMessage="Fleet upgraded {agentlessPolicyCount, plural, one {# managed integration} other {# managed integrations}}."
              values={{ agentlessPolicyCount: agentlessIdsToUpgrade.length }}
            />,
            startServices
          ),
        });
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate(
            'xpack.fleet.integrations.settings.errorUpdatingAgentlessPoliciesToast.title',
            {
              defaultMessage: 'Error upgrading managed integrations',
            }
          ),
          toastMessage: i18n.translate(
            'xpack.fleet.integrations.settings.errorUpdatingAgentlessPoliciesToast.exceptionMessage',
            {
              defaultMessage: 'Upgrade managed integrations manually.\nError: {error}',
              values: {
                error: error.message,
              },
            }
          ),
        });
      }
    };

    // Toasts (success/warning/error) are surfaced inside each helper. Regardless of the outcome we
    // must clear the upgrading flag before navigating: the destination is the new (now latest)
    // version where `updateAvailable` is false, so a lingering flag would keep the button rendered
    // in a permanent loading (gray) state.
    await Promise.all([upgradeAgentBasedPolicies(), upgradeAgentlessPolicies()]);

    setIsUpgradingPackagePolicies(false);
    navigateToNewSettingsPage();
  }, [
    isUpgradingPackagePolicies,
    setIsUpgradingPackagePolicies,
    installPackage,
    name,
    version,
    title,
    upgradePackagePoliciesMutation,
    packagePolicyIds,
    agentlessPolicyIds,
    dryRunData,
    agentlessDryRunData,
    notifications.toasts,
    startServices,
    navigateToNewSettingsPage,
  ]);

  const updateModal = (
    <EuiConfirmModal
      isLoading={isUpgradingPackagePolicies}
      maxWidth={568}
      onCancel={() => {
        setIsUpdateModalVisible(false);
      }}
      cancelButtonText={i18n.translate(
        'xpack.fleet.integrations.settings.confirmUpdateModal.cancel',
        { defaultMessage: 'Cancel' }
      )}
      onConfirm={handleClickUpgradePolicies}
      confirmButtonText={i18n.translate(
        'xpack.fleet.integrations.settings.confirmUpdateModal.confirm',
        { defaultMessage: 'Upgrade {packageName} and policies', values: { packageName: title } }
      )}
      title={i18n.translate('xpack.fleet.integrations.settings.confirmUpdateModal.updateTitle', {
        defaultMessage: 'Upgrade {packageName} and policies',
        values: { packageName: title },
      })}
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
    >
      <>
        {conflictCount && conflictCount > 0 ? (
          <>
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              title={i18n.translate(
                'xpack.fleet.integrations.settings.confirmUpdateModal.conflictCallOut.title',
                { defaultMessage: 'Some integration policies have conflicts' }
              )}
            >
              <strong>
                <FormattedMessage
                  id="xpack.fleet.integrations.settings.confirmUpdateModal.conflictCallOut.integrationPolicyCount"
                  defaultMessage="{conflictCount, plural, one { # integration policy} other { # integration policies}}"
                  values={{ conflictCount }}
                />
              </strong>{' '}
              <FormattedMessage
                id="xpack.fleet.integrations.settings.confirmUpdateModal.conflictCallOut.body"
                defaultMessage="{conflictCount, plural, one { has} other { have}} conflicts and will not be upgraded automatically.
                  You can manually resolve these conflicts via agent policy settings in Fleet after performing this upgrade."
                values={{ conflictCount }}
              />
            </EuiCallOut>

            <EuiSpacer size="l" />
          </>
        ) : null}
        <FormattedMessage
          id="xpack.fleet.integrations.settings.confirmUpdateModal.body"
          defaultMessage="This action will deploy updates to all agents which use these policies.
          Fleet has detected that {packagePolicyCountText} {packagePolicyCount, plural, one { is} other { are}} ready to be upgraded
          and {packagePolicyCount, plural, one { is} other { are}} already in use by {agentCountText}."
          values={{
            packagePolicyCount: totalPolicyCount,
            packagePolicyCountText: (
              <strong>
                <FormattedMessage
                  id="xpack.fleet.integrations.confirmUpdateModal.body.policyCount"
                  defaultMessage="{packagePolicyCount, plural, one {# integration policy} other {# integration policies}}"
                  values={{ packagePolicyCount: totalPolicyCount }}
                />
              </strong>
            ),
            agentCountText: (
              <strong>
                <FormattedMessage
                  id="xpack.fleet.integrations.confirmUpdateModal.body.agentCount"
                  defaultMessage="{agentCount, plural, one {# agent} other {# agents}}"
                  values={{ agentCount }}
                />
              </strong>
            ),
          }}
        />
        {hasMixedPolicyTypes && (
          <>
            <EuiSpacer size="m" />
            <FormattedMessage
              id="xpack.fleet.integrations.settings.confirmUpdateModal.policyTypeBreakdown"
              defaultMessage="These policies include {agentBasedCountText} and {agentlessCountText}."
              values={{
                agentBasedCountText: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.integrations.confirmUpdateModal.body.agentBasedPolicyCount"
                      defaultMessage="{agentBasedPolicyCount, plural, one {# agent-based policy} other {# agent-based policies}}"
                      values={{ agentBasedPolicyCount }}
                    />
                  </strong>
                ),
                agentlessCountText: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.integrations.confirmUpdateModal.body.agentlessPolicyCount"
                      defaultMessage="{agentlessPolicyCount, plural, one {# managed integration} other {# managed integrations}}"
                      values={{ agentlessPolicyCount }}
                    />
                  </strong>
                ),
              }}
            />
          </>
        )}
      </>
    </EuiConfirmModal>
  );

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            isLoading={isInstalling || isUpgradingPackagePolicies}
            onClick={
              upgradePackagePolicies ? () => setIsUpdateModalVisible(true) : handleClickUpdate
            }
            data-test-subj="updatePackageBtn"
            isDisabled={isDisabled || !canUpgradePackages}
          >
            <FormattedMessage
              id="xpack.fleet.integrations.updatePackage.updatePackageButtonLabel"
              defaultMessage="Upgrade to latest version"
            />
          </EuiButton>
        </EuiFlexItem>
        {totalPolicyCount > 0 && (
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              labelProps={{
                style: {
                  display: 'flex',
                },
              }}
              id="upgradePoliciesCheckbox"
              data-test-subj="epmDetails.upgradePoliciesCheckbox"
              disabled={!canUpgradePackages}
              checked={upgradePackagePolicies}
              onChange={handleUpgradePackagePoliciesChange}
              label={i18n.translate(
                'xpack.fleet.integrations.updatePackage.upgradePoliciesCheckboxLabel',
                {
                  defaultMessage: 'Upgrade integration policies',
                }
              )}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {isUpdateModalVisible && updateModal}
    </>
  );
};
