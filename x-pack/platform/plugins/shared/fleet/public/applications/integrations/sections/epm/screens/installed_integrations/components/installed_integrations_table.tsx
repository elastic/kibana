/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  type CriteriaWithPagination,
  EuiText,
  EuiSpacer,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Action } from '@elastic/eui/src/components/basic_table/action_types';

import { TableIcon } from '../../../../../../../components/package_icon';
import type { PackageListItem } from '../../../../../../../../common';
import { type UrlPagination, useLink, useAuthz, useLicense } from '../../../../../../../hooks';

import type { InstalledPackageUIPackageListItem } from '../types';
import { useViewPolicies } from '../hooks/use_url_filters';
import { useInstalledIntegrationsActions } from '../hooks/use_installed_integrations_actions';

import { ExperimentalFeaturesService } from '../../../../../services';

import {
  hasPreviousVersion,
  isRollbackTTLExpired,
  useRollbackAvailablePackages,
} from '../hooks/use_rollback_available';

import { wrapTitleWithDeprecated } from '../../../components/utils';

import { InstallationVersionStatus } from './installation_version_status';
import { DisabledWrapperTooltip } from './disabled_wrapper_tooltip';
import { DashboardsCell } from './dashboards_cell';

function wrapActionWithDisabledTooltip(
  action: Action<InstalledPackageUIPackageListItem>,
  disabled: boolean,
  tooltip: string
): Action<InstalledPackageUIPackageListItem> {
  return {
    ...action,
    ...(disabled ? { enabled: () => false, description: tooltip } : {}),
  };
}

export const InstalledIntegrationsTable: React.FunctionComponent<{
  installedPackages: InstalledPackageUIPackageListItem[];
  total: number;
  isLoading: boolean;
  pagination: UrlPagination;
  selection: {
    selectedItems: InstalledPackageUIPackageListItem[];
    setSelectedItems: React.Dispatch<React.SetStateAction<InstalledPackageUIPackageListItem[]>>;
  };
}> = ({ installedPackages, total, isLoading, pagination, selection }) => {
  const authz = useAuthz();
  const { getHref } = useLink();
  const { selectedItems, setSelectedItems } = selection;
  const { addViewPolicies } = useViewPolicies();
  const {
    actions: {
      bulkUninstallIntegrationsWithConfirmModal,
      bulkUpgradeIntegrationsWithConfirmModal,
      bulkRollbackIntegrationsWithConfirmModal,
    },
    rollingbackIntegrations,
  } = useInstalledIntegrationsActions();
  const { enablePackageRollback } = ExperimentalFeaturesService.get();
  const licenseService = useLicense();
  const { setPagination } = pagination;
  const handleTablePagination = React.useCallback(
    ({ page }: CriteriaWithPagination<InstalledPackageUIPackageListItem>) => {
      setPagination({
        currentPage: page.index + 1,
        pageSize: page.size,
      });
    },
    [setPagination]
  );
  const usedByAgentPolicy = (item: InstalledPackageUIPackageListItem) => {
    if (!item.packagePoliciesInfo) {
      return false;
    }
    const count = item.packagePoliciesInfo.count;
    return count > 0;
  };

  const isRollbackAvailablePackages: Record<string, boolean> =
    useRollbackAvailablePackages(installedPackages);

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.fleet.epmInstalledIntegrations.tableTotalCount"
          defaultMessage={'Showing {total, plural, one {# integration} other {# integrations}}'}
          values={{
            total,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable
        loading={isLoading}
        items={installedPackages}
        itemId="name"
        rowProps={{ 'data-test-subj': 'installedIntegrationsTableRow' }}
        tableCaption={i18n.translate('xpack.fleet.epmInstalledIntegrations.tableCaption', {
          defaultMessage: 'Installed integrations',
        })}
        pagination={{
          pageIndex: pagination.pagination.currentPage - 1,
          totalItemCount: total,
          pageSize: pagination.pagination.pageSize,
          showPerPageOptions: true,
          pageSizeOptions: pagination.pageSizeOptions,
        }}
        onChange={handleTablePagination}
        selection={{
          selectable: () => true,
          selected: selectedItems,
          onSelectionChange: (newSelectedItems) => {
            setSelectedItems(newSelectedItems);
          },
        }}
        columns={[
          {
            name: i18n.translate(
              'xpack.fleet.epmInstalledIntegrations.integrationNameColumnTitle',
              {
                defaultMessage: 'Integration name',
              }
            ),
            render: (item: PackageListItem) => {
              const url = getHref('integration_details_overview', {
                pkgkey: `${item.name}-${item.installationInfo!.version}`,
              });
              const isDeprecated = !!item?.deprecated;

              return (
                <EuiLink href={url}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <TableIcon
                        size="m"
                        icons={item.icons}
                        packageName={item.name}
                        version={item.version}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem
                      data-test-subj={`installedIntegrationsTable.integrationNameColumn.${item.name}`}
                      grow={false}
                    >
                      {wrapTitleWithDeprecated({ title: item.title, deprecated: isDeprecated })}
                    </EuiFlexItem>
                    {isDeprecated && (
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          type="warning"
                          color="warning"
                          content={i18n.translate(
                            'xpack.fleet.installedIntegrations.deprecatedTooltip',
                            {
                              defaultMessage: 'This integration is deprecated',
                            }
                          )}
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiLink>
              );
            },
          },
          {
            name: i18n.translate('xpack.fleet.epmInstalledIntegrations.versionColumnTitle', {
              defaultMessage: 'Version',
            }),
            render: (item: InstalledPackageUIPackageListItem) => (
              <InstallationVersionStatus item={item} />
            ),
          },
          {
            name: i18n.translate('xpack.fleet.epmInstalledIntegrations.dashboardsColumnTitle', {
              defaultMessage: 'Dashboards',
            }),
            render: (item: InstalledPackageUIPackageListItem) => <DashboardsCell package={item} />,
          },
          {
            name: i18n.translate(
              'xpack.fleet.epmInstalledIntegrations.attachedPoliciesColumnTitle',
              {
                defaultMessage: 'Attached policies',
              }
            ),
            width: '206px',
            render: (item: InstalledPackageUIPackageListItem) => {
              const policyCount = item.packagePoliciesInfo?.count ?? 0;
              if (!policyCount) {
                return null;
              }

              const isDisabled = !authz.fleet.readAgentPolicies;

              return (
                <DisabledWrapperTooltip
                  tooltipContent={
                    <FormattedMessage
                      id="xpack.fleet.epmInstalledIntegrations.agentPoliciesRequiredPermissionTooltip"
                      defaultMessage={
                        "You don't have permissions to view these policies. Contact your administrator."
                      }
                    />
                  }
                  disabled={isDisabled}
                >
                  <EuiLink onClick={() => addViewPolicies(item.name)} disabled={isDisabled}>
                    <FormattedMessage
                      id="xpack.fleet.epmInstalledIntegrations.viewAttachedPoliciesButton"
                      defaultMessage={
                        'View {policyCount, plural, one {# policies} other {# policies}}'
                      }
                      values={{
                        policyCount,
                      }}
                    />
                  </EuiLink>
                </DisabledWrapperTooltip>
              );
            },
          },
          {
            actions: [
              wrapActionWithDisabledTooltip(
                {
                  name: i18n.translate('xpack.fleet.epmInstalledIntegrations.upgradeActionLabel', {
                    defaultMessage: 'Upgrade',
                  }),
                  description: (item) =>
                    i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.upgradeActionDescription',
                      {
                        defaultMessage: 'Upgrade to {version}.',
                        values: { version: item.version },
                      }
                    ),
                  icon: 'refresh',
                  type: 'icon',
                  onClick: (item) => bulkUpgradeIntegrationsWithConfirmModal([item]),
                  enabled: (item) =>
                    item.ui.installation_status === 'upgrade_available' ||
                    item.ui.installation_status === 'upgrade_failed' ||
                    item.ui.installation_status === 'install_failed',
                },
                !authz.integrations.upgradePackages,
                i18n.translate(
                  'xpack.fleet.epmInstalledIntegrations.upgradeIntegrationsRequiredPermissionTooltip',
                  {
                    defaultMessage:
                      "You don't have permissions to upgrade integrations. Contact your administrator.",
                  }
                )
              ),
              wrapActionWithDisabledTooltip(
                {
                  name: i18n.translate('xpack.fleet.epmInstalledIntegrations.viewPoliciesLabel', {
                    defaultMessage: 'View policies',
                  }),
                  icon: 'search',
                  type: 'icon',
                  description: i18n.translate(
                    'xpack.fleet.epmInstalledIntegrations.viewPoliciesLabel',
                    {
                      defaultMessage: 'View policies',
                    }
                  ),
                  onClick: (item) => addViewPolicies(item.name),
                  enabled: (item) => (item?.packagePoliciesInfo?.count ?? 0) > 0,
                },
                !authz.fleet.readAgentPolicies,
                i18n.translate(
                  'xpack.fleet.epmInstalledIntegrations.agentPoliciesRequiredPermissionTooltip',
                  {
                    defaultMessage:
                      "You don't have permissions to view these policies. Contact your administrator.",
                  }
                )
              ),
              {
                name: i18n.translate('xpack.fleet.epmInstalledIntegrations.editIntegrationLabel', {
                  defaultMessage: 'Edit integration',
                }),
                icon: 'pencil',
                type: 'icon',
                description: i18n.translate(
                  'xpack.fleet.epmInstalledIntegrations.editIntegrationLabel',
                  {
                    defaultMessage: 'Edit integration',
                  }
                ),
                href: (item) =>
                  getHref('integration_details_overview', {
                    pkgkey: `${item.name}-${item.installationInfo!.version}`,
                  }),
              },
              wrapActionWithDisabledTooltip(
                {
                  name: i18n.translate(
                    'xpack.fleet.epmInstalledIntegrations.uninstallIntegrationLabel',
                    {
                      defaultMessage: 'Uninstall integration',
                    }
                  ),
                  icon: 'trash',
                  type: 'icon',

                  onClick: (item) => bulkUninstallIntegrationsWithConfirmModal([item]),
                  enabled: (item) => !usedByAgentPolicy(item),
                  description: (item) =>
                    i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.uninstallIntegrationLabel',
                      {
                        defaultMessage: usedByAgentPolicy(item)
                          ? "You can't uninstall this integration because it is used by one or more agent policies"
                          : 'Uninstall integration',
                      }
                    ),
                },
                !authz.integrations.removePackages,
                i18n.translate(
                  'xpack.fleet.epmInstalledIntegrations.removeIntegrationsRequiredPermissionTooltip',
                  {
                    defaultMessage:
                      "You don't have permissions to remove integrations. Contact your administrator.",
                  }
                )
              ),
              ...(enablePackageRollback
                ? [
                    wrapActionWithDisabledTooltip(
                      {
                        name: i18n.translate(
                          'xpack.fleet.epmInstalledIntegrations.rollbackIntegrationLabel',
                          {
                            defaultMessage: 'Rollback integration',
                          }
                        ),
                        icon: 'returnKey',
                        type: 'icon',
                        'data-test-subj': 'rollbackButton',
                        onClick: (item) => bulkRollbackIntegrationsWithConfirmModal([item]),
                        enabled: (item) => {
                          const isAvailable = isRollbackAvailablePackages[item.name] ?? false;
                          const isRollingBack =
                            rollingbackIntegrations?.some((u) => u.name === item.name) ?? false;

                          return isAvailable && !isRollingBack;
                        },
                        description: (item) =>
                          !hasPreviousVersion(item)
                            ? i18n.translate(
                                'xpack.fleet.epmInstalledIntegrations.rollbackIntegrationsNoPreviousVersionLabel',
                                {
                                  defaultMessage:
                                    "You can't rollback this integration because it does not have a previous version saved.",
                                }
                              )
                            : !licenseService.isEnterprise()
                            ? i18n.translate(
                                'xpack.fleet.epmInstalledIntegrations.rollbackIntegrationsNoEnterpriseLabel',
                                {
                                  defaultMessage:
                                    'Rollback integrations requires an enterprise license.',
                                }
                              )
                            : isRollbackTTLExpired(item)
                            ? i18n.translate(
                                'xpack.fleet.epmInstalledIntegrations.rollbackIntegrationsTTLExpiredLabel',
                                {
                                  defaultMessage:
                                    'Rollback is no longer allowed for this integration.',
                                }
                              )
                            : i18n.translate(
                                'xpack.fleet.epmInstalledIntegrations.rollbackIntegrationLabel',
                                {
                                  defaultMessage: 'Rollback integration',
                                }
                              ),
                      },
                      !authz.integrations.installPackages,
                      i18n.translate(
                        'xpack.fleet.epmInstalledIntegrations.rollbackIntegrationsRequiredPermissionTooltip',
                        {
                          defaultMessage:
                            "You don't have permissions to rollback integrations. Contact your administrator.",
                        }
                      )
                    ),
                  ]
                : []),
            ],
          },
        ]}
      />
    </>
  );
};
