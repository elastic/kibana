/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiToolTip,
  EuiButtonIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiIcon,
  EuiIconTip,
} from '@elastic/eui';

import { SlmPolicy } from '../../../../../../common/types';
import { UIM_POLICY_SHOW_DETAILS_CLICK } from '../../../../constants';
import { useAppDependencies } from '../../../../index';
import {
  FormattedDateTime,
  PolicyExecuteProvider,
  PolicyDeleteProvider,
} from '../../../../components';
import { uiMetricService } from '../../../../services/ui_metric';
import { linkToAddPolicy, linkToEditPolicy } from '../../../../services/navigation';
import { SendRequestResponse } from '../../../../../shared_imports';

interface Props {
  policies: SlmPolicy[];
  reload: () => Promise<SendRequestResponse>;
  openPolicyDetailsUrl: (name: SlmPolicy['name']) => string;
  onPolicyDeleted: (policiesDeleted: Array<SlmPolicy['name']>) => void;
  onPolicyExecuted: () => void;
}

export const PolicyTable: React.FunctionComponent<Props> = ({
  policies,
  reload,
  openPolicyDetailsUrl,
  onPolicyDeleted,
  onPolicyExecuted,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { trackUiMetric } = uiMetricService;
  const [selectedItems, setSelectedItems] = useState<SlmPolicy[]>([]);

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.policyNameColumnTitle', {
        defaultMessage: 'Policy',
      }),
      truncateText: true,
      sortable: true,
      render: (name: SlmPolicy['name'], { inProgress, isManagedPolicy }: SlmPolicy) => {
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiLink
                onClick={() => trackUiMetric(UIM_POLICY_SHOW_DETAILS_CLICK)}
                href={openPolicyDetailsUrl(name)}
                data-test-subj="policyLink"
              >
                {name}
              </EuiLink>{' '}
            </EuiFlexItem>
            {isManagedPolicy ? (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyList.table.managedPolicyBadgeLabel"
                      defaultMessage="This is a managed policy"
                    />
                  }
                  position="right"
                />
              </EuiFlexItem>
            ) : null}
            {inProgress ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.snapshotRestore.policyList.table.inProgressTooltip',
                    {
                      defaultMessage: 'Snapshot in progress',
                    }
                  )}
                >
                  <EuiLoadingSpinner size="m" />
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'snapshotName',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.snapshotNameColumnTitle', {
        defaultMessage: 'Snapshot name',
      }),
      sortable: true,
      render: (
        snapshotName: SlmPolicy['snapshotName'],
        { lastFailure, lastSuccess }: SlmPolicy
      ) => {
        // Alert user if last snapshot failed
        if (lastSuccess && lastFailure && lastFailure.time > lastSuccess.time) {
          return (
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              className="snapshotRestorePolicyTableSnapshotFailureContainer"
            >
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="top"
                  content={i18n.translate(
                    'xpack.snapshotRestore.policyList.table.lastSnapshotFailedTooltip',
                    {
                      defaultMessage: 'Last snapshot failed',
                    }
                  )}
                >
                  <EuiIcon type="alert" color="danger" />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiText size="s">{snapshotName}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }
        return snapshotName;
      },
    },
    {
      field: 'repository',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.repositoryColumnTitle', {
        defaultMessage: 'Repository',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'schedule',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.scheduleColumnTitle', {
        defaultMessage: 'Schedule',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'retention',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.retentionColumnTitle', {
        defaultMessage: 'Retention',
      }),
      render: (retention: SlmPolicy['retention']) =>
        retention ? (
          <EuiIcon
            type="check"
            aria-label={i18n.translate(
              'xpack.snapshotRestore.policyList.table.retentionColumnAriaLabel',
              {
                defaultMessage: 'Retention configured',
              }
            )}
          />
        ) : null,
    },
    {
      field: 'nextExecutionMillis',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.nextExecutionColumnTitle', {
        defaultMessage: 'Next snapshot',
      }),
      truncateText: true,
      sortable: true,
      render: (nextExecutionMillis: SlmPolicy['nextExecutionMillis']) => (
        <FormattedDateTime epochMs={nextExecutionMillis} />
      ),
    },
    {
      name: i18n.translate('xpack.snapshotRestore.policyList.table.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: ({ name, inProgress, isManagedPolicy }: SlmPolicy) => {
            return (
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <PolicyExecuteProvider>
                    {executePolicyPrompt => {
                      return (
                        <EuiToolTip
                          content={
                            Boolean(inProgress)
                              ? i18n.translate(
                                  'xpack.snapshotRestore.policyList.table.actionExecuteDisabledTooltip',
                                  { defaultMessage: 'Policy is running' }
                                )
                              : i18n.translate(
                                  'xpack.snapshotRestore.policyList.table.actionExecuteTooltip',
                                  { defaultMessage: 'Run now' }
                                )
                          }
                        >
                          <EuiButtonIcon
                            aria-label={i18n.translate(
                              'xpack.snapshotRestore.policyList.table.actionExecuteAriaLabel',
                              {
                                defaultMessage: `Run '{name}' immediately`,
                                values: { name },
                              }
                            )}
                            iconType="play"
                            color="primary"
                            data-test-subj="executePolicyButton"
                            onClick={() => executePolicyPrompt(name, onPolicyExecuted)}
                            disabled={Boolean(inProgress)}
                          />
                        </EuiToolTip>
                      );
                    }}
                  </PolicyExecuteProvider>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.snapshotRestore.policyList.table.actionEditTooltip',
                      { defaultMessage: 'Edit' }
                    )}
                  >
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.snapshotRestore.policyList.table.actionEditAriaLabel',
                        {
                          defaultMessage: `Edit policy '{name}'`,
                          values: { name },
                        }
                      )}
                      iconType="pencil"
                      color="primary"
                      href={linkToEditPolicy(name)}
                      data-test-subj="editPolicyButton"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <PolicyDeleteProvider>
                    {deletePolicyPrompt => {
                      const label = !isManagedPolicy
                        ? i18n.translate(
                            'xpack.snapshotRestore.policyList.table.actionDeleteTooltip',
                            { defaultMessage: 'Delete' }
                          )
                        : i18n.translate(
                            'xpack.snapshotRestore.policyList.table.deleteManagedPolicyTableActionTooltip',
                            {
                              defaultMessage: 'You cannot delete a managed policy.',
                            }
                          );
                      return (
                        <EuiToolTip content={label}>
                          <EuiButtonIcon
                            aria-label={i18n.translate(
                              'xpack.snapshotRestore.policyList.table.actionDeleteAriaLabel',
                              {
                                defaultMessage: `Delete policy '{name}'`,
                                values: { name },
                              }
                            )}
                            iconType="trash"
                            color="danger"
                            data-test-subj="deletePolicyButton"
                            onClick={() => deletePolicyPrompt([name], onPolicyDeleted)}
                            isDisabled={isManagedPolicy}
                          />
                        </EuiToolTip>
                      );
                    }}
                  </PolicyDeleteProvider>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  const sorting = {
    sort: {
      field: 'name',
      direction: 'asc' as const,
    },
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const selection = {
    onSelectionChange: (newSelectedItems: SlmPolicy[]) => setSelectedItems(newSelectedItems),
    selectable: ({ isManagedPolicy }: SlmPolicy) => !isManagedPolicy,
    selectableMessage: (selectable: boolean) => {
      if (!selectable) {
        return i18n.translate(
          'xpack.snapshotRestore.policyList.table.deleteManagedPolicySelectTooltip',
          {
            defaultMessage: 'You cannot delete a managed policy.',
          }
        );
      }
    },
  };

  const search = {
    toolsLeft: selectedItems.length ? (
      <PolicyDeleteProvider>
        {(
          deletePolicyPrompt: (
            names: Array<SlmPolicy['name']>,
            onSuccess?: (policiesDeleted: Array<SlmPolicy['name']>) => void
          ) => void
        ) => {
          return (
            <EuiButton
              onClick={() =>
                deletePolicyPrompt(
                  selectedItems.map(({ name }) => name),
                  onPolicyDeleted
                )
              }
              color="danger"
              data-test-subj="srPolicyListBulkDeleteActionButton"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.policyList.table.deletePolicyButton"
                defaultMessage="Delete {count, plural, one {policy} other {policies}}"
                values={{
                  count: selectedItems.length,
                }}
              />
            </EuiButton>
          );
        }}
      </PolicyDeleteProvider>
    ) : (
      undefined
    ),
    toolsRight: [
      <EuiButton
        key="reloadPolicies"
        color="secondary"
        iconType="refresh"
        onClick={reload}
        data-test-subj="reloadButton"
      >
        <FormattedMessage
          id="xpack.snapshotRestore.policyList.table.reloadPoliciesButton"
          defaultMessage="Reload"
        />
      </EuiButton>,
      <EuiButton
        key="createNewPolicy"
        href={linkToAddPolicy()}
        fill
        iconType="plusInCircle"
        data-test-subj="createPolicyButton"
      >
        <FormattedMessage
          id="xpack.snapshotRestore.policyList.table.addPolicyButton"
          defaultMessage="Create a policy"
        />
      </EuiButton>,
    ],
    box: {
      incremental: true,
      schema: true,
    },
    filters: [
      {
        type: 'field_value_selection' as const,
        field: 'repository',
        name: i18n.translate('xpack.snapshotRestore.policyList.table.repositoryFilterLabel', {
          defaultMessage: 'Repository',
        }),
        multiSelect: false,
        options: Object.keys(
          policies.reduce((repositoriesMap: any, policy) => {
            repositoriesMap[policy.repository] = true;
            return repositoriesMap;
          }, {})
        ).map(repository => {
          return {
            value: repository,
            view: repository,
          };
        }),
      },
    ],
  };

  return (
    <EuiInMemoryTable
      className="snapshotRestore__policyTable"
      items={policies}
      itemId="name"
      columns={columns}
      search={search}
      sorting={sorting}
      selection={selection}
      pagination={pagination}
      isSelectable={true}
      rowProps={() => ({
        'data-test-subj': 'row',
      })}
      cellProps={() => ({
        'data-test-subj': 'cell',
      })}
      data-test-subj="policyTable"
    />
  );
};
