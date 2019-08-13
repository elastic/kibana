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

interface Props {
  policies: SlmPolicy[];
  reload: () => Promise<void>;
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
      render: (name: SlmPolicy['name']) => {
        return (
          <EuiLink
            onClick={() => trackUiMetric(UIM_POLICY_SHOW_DETAILS_CLICK)}
            href={openPolicyDetailsUrl(name)}
            data-test-subj="policyLink"
          >
            {name}
          </EuiLink>
        );
      },
    },
    {
      field: 'snapshotName',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.snapshotNameColumnTitle', {
        defaultMessage: 'Snapshot name',
      }),
      truncateText: true,
      sortable: true,
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
      field: 'nextExecutionMillis',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.nextExecutionColumnTitle', {
        defaultMessage: 'Next execution',
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
          render: ({ name }: SlmPolicy) => {
            return (
              <PolicyExecuteProvider>
                {executePolicyPrompt => {
                  const label = i18n.translate(
                    'xpack.snapshotRestore.policyList.table.actionExecuteTooltip',
                    { defaultMessage: 'Run policy' }
                  );
                  return (
                    <EuiToolTip content={label}>
                      <EuiButtonIcon
                        aria-label={i18n.translate(
                          'xpack.snapshotRestore.policyList.table.actionExecuteAriaLabel',
                          {
                            defaultMessage: `Run policy '{name}'`,
                            values: { name },
                          }
                        )}
                        iconType="play"
                        color="primary"
                        data-test-subj="executePolicyButton"
                        onClick={() => executePolicyPrompt(name, onPolicyExecuted)}
                      />
                    </EuiToolTip>
                  );
                }}
              </PolicyExecuteProvider>
            );
          },
        },
        {
          render: ({ name }: SlmPolicy) => {
            return (
              <PolicyDeleteProvider>
                {deletePolicyPrompt => {
                  const label = i18n.translate(
                    'xpack.snapshotRestore.policyList.table.actionDeleteTooltip',
                    { defaultMessage: 'Delete' }
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
                      />
                    </EuiToolTip>
                  );
                }}
              </PolicyDeleteProvider>
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
      direction: 'asc',
    },
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const selection = {
    onSelectionChange: (newSelectedItems: SlmPolicy[]) => setSelectedItems(newSelectedItems),
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
                deletePolicyPrompt(selectedItems.map(({ name }) => name), onPolicyDeleted)
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
    toolsRight: (
      <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
        <EuiFlexItem>
          <EuiButton
            color="secondary"
            iconType="refresh"
            onClick={reload}
            data-test-subj="reloadButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyList.table.reloadPoliciesButton"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    box: {
      incremental: true,
      schema: true,
    },
    filters: [
      {
        type: 'field_value_selection',
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
