/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import semverLt from 'semver/functions/lt';

import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiPortal,
  EuiCallOut,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { FleetStartServices } from '../../../../../../../plugin';
import type { PackageInfo, PackageMetadata } from '../../../../../types';
import { InstallStatus } from '../../../../../types';
import {
  useGetPackagePoliciesQuery,
  useGetPackageInstallStatus,
  useLink,
  useStartServices,
  useUpgradePackagePolicyDryRunQuery,
  useUpdatePackageMutation,
  useAuthz,
} from '../../../../../hooks';
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  KEEP_POLICIES_UP_TO_DATE_PACKAGES,
  AUTO_UPGRADE_POLICIES_PACKAGES,
  SO_SEARCH_LIMIT,
} from '../../../../../constants';
import { SideBarColumn } from '../../../components/side_bar_column';
import { BulkActionContextProvider } from '../../installed_integrations/hooks/use_bulk_actions_context';
import { KeepPoliciesUpToDateSwitch } from '../components';
import { useChangelog } from '../hooks';

import { ExperimentalFeaturesService } from '../../../../../services';

import { DeprecationCallout } from '../overview/overview';

import { wrapTitleWithDeprecated } from '../../../components/utils';

import { InstallButton } from './install_button';
import { ReinstallButton } from './reinstall_button';
import { UpdateButton } from './update_button';
import { UninstallButton } from './uninstall_button';
import { ChangelogModal } from './changelog_modal';
import { UpdateAvailableCallout } from './update_available_callout';
import { BreakingChangesFlyout } from './breaking_changes_flyout';
import { RollbackButton } from './rollback_button';

const SettingsTitleCell = styled.td`
  padding-right: ${(props) => props.theme.eui.euiSizeXL};
  padding-bottom: ${(props) => props.theme.eui.euiSizeM};
`;

const NoteLabel = () => (
  <strong>
    <FormattedMessage
      id="xpack.fleet.integrations.settings.packageUninstallNoteDescription.packageUninstallNoteLabel"
      defaultMessage="Note:"
    />
  </strong>
);

const LatestVersionLink = ({ name, version }: { name: string; version: string }) => {
  const { getHref } = useLink();
  const settingsPath = getHref('integration_details_settings', {
    pkgkey: `${name}-${version}`,
  });
  return (
    <EuiLink href={settingsPath}>
      <FormattedMessage
        id="xpack.fleet.integrations.settings.packageLatestVersionLink"
        defaultMessage="latest version"
      />
    </EuiLink>
  );
};

interface Props {
  packageInfo: PackageInfo;
  packageMetadata?: PackageMetadata;
  startServices: Pick<FleetStartServices, 'analytics' | 'i18n' | 'theme'>;
  isCustomPackage: boolean;
}

export const SettingsPage: React.FC<Props> = memo(
  ({ packageInfo, packageMetadata, startServices, isCustomPackage }: Props) => {
    const authz = useAuthz();
    const canInstallPackages = authz.integrations.installPackages;
    const { name, title, latestVersion, version, keepPoliciesUpToDate } = packageInfo;
    const [isUpgradingPackagePolicies, setIsUpgradingPackagePolicies] = useState<boolean>(false);
    const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
    const [isBreakingChangesUnderstood, setIsBreakingChangesUnderstood] = useState(false);
    const [isBreakingChangesFlyoutOpen, setIsBreakingChangesFlyoutOpen] = useState(false);
    const { enablePackageRollback } = ExperimentalFeaturesService.get();
    const toggleChangelogModal = useCallback(() => {
      setIsChangelogModalOpen(!isChangelogModalOpen);
    }, [isChangelogModalOpen]);
    const getPackageInstallStatus = useGetPackageInstallStatus();

    const { data: packagePoliciesData } = useGetPackagePoliciesQuery({
      perPage: SO_SEARCH_LIMIT,
      page: 1,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${name}`,
    });

    const {
      changelog,
      breakingChanges,
      isLoading: isChangelogLoading,
      error: changelogError,
    } = useChangelog(name, latestVersion, version);

    const packagePolicyIds = useMemo(
      () => packagePoliciesData?.items.map(({ id }) => id),
      [packagePoliciesData]
    );

    const agentPolicyIds = useMemo(
      () => packagePoliciesData?.items.flatMap((packagePolicy) => packagePolicy.policy_ids) ?? [],
      [packagePoliciesData]
    );

    const { data: dryRunData } = useUpgradePackagePolicyDryRunQuery(
      packagePolicyIds ?? [],
      latestVersion,
      {
        enabled: packagePolicyIds && packagePolicyIds.length > 0,
      }
    );

    const updatePackageMutation = useUpdatePackageMutation();

    const { notifications } = useStartServices();

    const shouldShowKeepPoliciesUpToDateSwitch = useMemo(() => {
      return KEEP_POLICIES_UP_TO_DATE_PACKAGES.some((pkg) => pkg.name === name);
    }, [name]);

    const isShowKeepPoliciesUpToDateSwitchDisabled = useMemo(() => {
      return (
        !authz.integrations.writePackageSettings ||
        AUTO_UPGRADE_POLICIES_PACKAGES.some((pkg) => pkg.name === name)
      );
    }, [authz.integrations.writePackageSettings, name]);

    const [keepPoliciesUpToDateSwitchValue, setKeepPoliciesUpToDateSwitchValue] = useState<boolean>(
      keepPoliciesUpToDate ?? false
    );

    const handleKeepPoliciesUpToDateSwitchChange = useCallback(() => {
      setKeepPoliciesUpToDateSwitchValue((prev) => !prev);

      updatePackageMutation.mutate(
        {
          pkgName: packageInfo.name,
          pkgVersion: packageInfo.version,
          body: {
            keepPoliciesUpToDate: !keepPoliciesUpToDateSwitchValue,
          },
        },
        {
          onSuccess: () => {
            notifications.toasts.addSuccess({
              title: i18n.translate('xpack.fleet.integrations.integrationSaved', {
                defaultMessage: 'Integration settings saved',
              }),
              text: !keepPoliciesUpToDateSwitchValue
                ? i18n.translate('xpack.fleet.integrations.keepPoliciesUpToDateEnabledSuccess', {
                    defaultMessage:
                      'Fleet will automatically keep integration policies up to date for {title}',
                    values: { title },
                  })
                : i18n.translate('xpack.fleet.integrations.keepPoliciesUpToDateDisabledSuccess', {
                    defaultMessage:
                      'Fleet will not automatically keep integration policies up to date for {title}',
                    values: { title },
                  }),
            });
          },
          onError: (error) => {
            notifications.toasts.addError(error, {
              title: i18n.translate('xpack.fleet.integrations.integrationSavedError', {
                defaultMessage: 'Error saving integration settings',
              }),
              toastMessage: i18n.translate('xpack.fleet.integrations.keepPoliciesUpToDateError', {
                defaultMessage: 'Error saving integration settings for {title}',
                values: { title },
              }),
            });
          },
        }
      );
    }, [
      keepPoliciesUpToDateSwitchValue,
      notifications.toasts,
      packageInfo.name,
      packageInfo.version,
      title,
      updatePackageMutation,
    ]);

    const { status: installationStatus, version: installedVersion } = getPackageInstallStatus(name);

    const updateAvailable =
      installedVersion && semverLt(installedVersion, latestVersion) ? true : false;

    const isViewingOldPackage = version < latestVersion;
    // hide install/remove options if the user has version of the package is installed
    // and this package is out of date or if they do have a version installed but it's not this one
    const hideInstallOptions =
      (installationStatus === InstallStatus.notInstalled && isViewingOldPackage) ||
      (installationStatus === InstallStatus.installed && installedVersion !== version);

    const isUpdating = installationStatus === InstallStatus.installing && installedVersion;

    useEffect(() => {
      if (changelogError) {
        notifications.toasts.addError(changelogError, {
          title: i18n.translate('xpack.fleet.epm.errorLoadingChangelog', {
            defaultMessage: 'Error loading changelog information',
          }),
        });
      }
    }, [changelogError, notifications.toasts]);

    return (
      <>
        <EuiFlexGroup alignItems="flexStart">
          <SideBarColumn grow={1} />
          <EuiFlexItem grow={7}>
            <EuiText>
              <EuiTitle>
                <h3>
                  <FormattedMessage
                    id="xpack.fleet.integrations.settings.packageSettingsTitle"
                    defaultMessage="Settings"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <DeprecationCallout packageInfo={packageInfo} />
              {installedVersion !== null && (
                <div>
                  <EuiTitle>
                    <h4>
                      <FormattedMessage
                        id="xpack.fleet.integrations.settings.packageVersionTitle"
                        defaultMessage="{title} version"
                        values={{
                          title,
                        }}
                      />
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <table>
                    <tbody>
                      <tr>
                        <SettingsTitleCell>
                          <FormattedMessage
                            id="xpack.fleet.integrations.settings.versionInfo.installedVersion"
                            defaultMessage="Installed version"
                          />
                        </SettingsTitleCell>
                        <td>
                          <EuiTitle size="xs" data-test-subj="epmSettings.installedVersionTitle">
                            <span>{installedVersion}</span>
                          </EuiTitle>
                        </td>
                      </tr>
                      <tr>
                        <SettingsTitleCell>
                          <FormattedMessage
                            id="xpack.fleet.integrations.settings.versionInfo.latestVersion"
                            defaultMessage="Latest version"
                          />
                        </SettingsTitleCell>
                        <td>
                          <EuiTitle size="xs" data-test-subj="epmSettings.latestVersionTitle">
                            <span>{latestVersion}</span>
                          </EuiTitle>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {shouldShowKeepPoliciesUpToDateSwitch && (
                    <>
                      <KeepPoliciesUpToDateSwitch
                        checked={keepPoliciesUpToDateSwitchValue}
                        onChange={handleKeepPoliciesUpToDateSwitchChange}
                        disabled={isShowKeepPoliciesUpToDateSwitchDisabled}
                      />
                      <EuiSpacer size="l" />
                    </>
                  )}

                  {(updateAvailable || isUpgradingPackagePolicies) && (
                    <>
                      <UpdateAvailableCallout
                        version={latestVersion}
                        toggleChangelogModal={toggleChangelogModal}
                        breakingChanges={
                          breakingChanges
                            ? {
                                changelog: breakingChanges,
                                isUnderstood: isBreakingChangesUnderstood,
                                toggleIsUnderstood: () =>
                                  setIsBreakingChangesUnderstood((prev) => !prev),
                                onOpen: () => setIsBreakingChangesFlyoutOpen(true),
                              }
                            : null
                        }
                      />
                      <EuiSpacer size="l" />
                      <p>
                        <UpdateButton
                          {...packageInfo}
                          name={packageInfo.name}
                          title={wrapTitleWithDeprecated({ packageInfo })}
                          version={latestVersion}
                          agentPolicyIds={agentPolicyIds}
                          packagePolicyIds={packagePolicyIds}
                          dryRunData={dryRunData}
                          isUpgradingPackagePolicies={isUpgradingPackagePolicies}
                          setIsUpgradingPackagePolicies={setIsUpgradingPackagePolicies}
                          startServices={startServices}
                          isDisabled={Boolean(breakingChanges) && !isBreakingChangesUnderstood}
                        />
                      </p>
                    </>
                  )}
                </div>
              )}
              {!hideInstallOptions && !isUpdating && (
                <div>
                  <EuiSpacer size="s" />
                  {installationStatus === InstallStatus.notInstalled ||
                  installationStatus === InstallStatus.installing ? (
                    <div>
                      <EuiTitle>
                        <h4>
                          <FormattedMessage
                            id="xpack.fleet.integrations.settings.packageInstallTitle"
                            defaultMessage="Install {title}"
                            values={{
                              title,
                            }}
                          />
                        </h4>
                      </EuiTitle>
                      <EuiSpacer size="s" />
                      {canInstallPackages ? (
                        <>
                          <p>
                            <FormattedMessage
                              id="xpack.fleet.integrations.settings.packageInstallDescription"
                              defaultMessage="Install this integration to setup Kibana and Elasticsearch assets designed for {title} data."
                              values={{
                                title,
                              }}
                            />
                          </p>
                          <EuiFlexGroup>
                            <EuiFlexItem grow={false}>
                              <p>
                                <InstallButton
                                  {...packageInfo}
                                  disabled={packageMetadata?.has_policies}
                                />
                              </p>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </>
                      ) : (
                        <EuiCallOut
                          announceOnMount
                          color="warning"
                          iconType="lock"
                          data-test-subj="installPermissionCallout"
                          title={
                            <FormattedMessage
                              id="xpack.fleet.integrations.settings.installPermissionRequiredTitle"
                              defaultMessage="Permission required"
                            />
                          }
                        >
                          <FormattedMessage
                            id="xpack.fleet.integrations.settings.installPermissionRequired"
                            defaultMessage="You do not have permission to install this integration. Contact your administrator."
                          />
                        </EuiCallOut>
                      )}
                    </div>
                  ) : (
                    <>
                      <EuiFlexGroup direction="column" gutterSize="m">
                        <EuiFlexItem>
                          <EuiTitle>
                            <h4>
                              <FormattedMessage
                                id="xpack.fleet.integrations.settings.packageUninstallTitle"
                                defaultMessage="Uninstall"
                              />
                            </h4>
                          </EuiTitle>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <FormattedMessage
                            id="xpack.fleet.integrations.settings.packageUninstallDescription"
                            defaultMessage="Remove Kibana and Elasticsearch assets that were installed by this integration."
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <div>
                            <UninstallButton
                              {...packageInfo}
                              latestVersion={latestVersion}
                              disabled={packageMetadata?.has_policies}
                            />
                          </div>
                        </EuiFlexItem>
                        {packageMetadata?.has_policies && (
                          <EuiFlexItem>
                            <EuiText color="subdued" size="s">
                              <FormattedMessage
                                id="xpack.fleet.integrations.settings.packageUninstallNoteDescription.packageUninstallNoteDetail"
                                defaultMessage="{strongNote} {title} cannot be uninstalled because there are active agents that use this integration. To uninstall, remove all {title} integrations from your agent policies."
                                values={{
                                  title,
                                  strongNote: <NoteLabel />,
                                }}
                              />
                            </EuiText>
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                      <EuiSpacer size="l" />
                      <EuiFlexGroup direction="column" gutterSize="m">
                        <EuiFlexItem>
                          <EuiTitle>
                            <h4>
                              <FormattedMessage
                                id="xpack.fleet.integrations.settings.packageReinstallTitle"
                                defaultMessage="Reinstall"
                              />
                            </h4>
                          </EuiTitle>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <FormattedMessage
                            id="xpack.fleet.integrations.settings.packageReinstallDescription"
                            defaultMessage="Reinstall Kibana and Elasticsearch assets for this integration."
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <div>
                            <ReinstallButton
                              {...packageInfo}
                              installSource={
                                'installationInfo' in packageInfo &&
                                packageInfo.installationInfo?.install_source
                                  ? packageInfo.installationInfo.install_source
                                  : ''
                              }
                              isCustomPackage={isCustomPackage}
                            />
                          </div>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="l" />
                      {enablePackageRollback && (
                        <>
                          <EuiFlexGroup direction="column" gutterSize="m">
                            <EuiFlexItem>
                              <EuiTitle>
                                <h4>
                                  <FormattedMessage
                                    id="xpack.fleet.integrations.settings.packageRollbackTitle"
                                    defaultMessage="Rollback"
                                  />
                                </h4>
                              </EuiTitle>
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <FormattedMessage
                                id="xpack.fleet.integrations.settings.packageRollbackDescription"
                                defaultMessage="Rollback integration to the previous version."
                              />
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <div>
                                <BulkActionContextProvider>
                                  <RollbackButton
                                    packageInfo={packageInfo}
                                    isCustomPackage={isCustomPackage}
                                  />
                                </BulkActionContextProvider>
                              </div>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiSpacer size="l" />
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              {hideInstallOptions && isViewingOldPackage && !isUpdating && (
                <div>
                  <EuiSpacer size="s" />
                  <div>
                    <EuiTitle>
                      <h4>
                        <FormattedMessage
                          id="xpack.fleet.integrations.settings.packageInstallTitle"
                          defaultMessage="Install {title}"
                          values={{
                            title,
                          }}
                        />
                      </h4>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <p>
                      <EuiText color="subdued">
                        <FormattedMessage
                          id="xpack.fleet.integrations.settings.packageSettingsOldVersionMessage"
                          defaultMessage="Version {version} is out of date. The {latestVersion} of this integration is available to be installed."
                          values={{
                            version,
                            latestVersion: (
                              <LatestVersionLink name={name} version={latestVersion} />
                            ),
                          }}
                        />
                      </EuiText>
                    </p>
                  </div>
                </div>
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiPortal>
          {isChangelogModalOpen && (
            <ChangelogModal
              changelog={changelog}
              isLoading={isChangelogLoading}
              onClose={toggleChangelogModal}
            />
          )}
        </EuiPortal>
        {isBreakingChangesFlyoutOpen && breakingChanges && (
          <BreakingChangesFlyout
            breakingChanges={breakingChanges}
            onClose={() => setIsBreakingChangesFlyoutOpen(false)}
          />
        )}
      </>
    );
  }
);
