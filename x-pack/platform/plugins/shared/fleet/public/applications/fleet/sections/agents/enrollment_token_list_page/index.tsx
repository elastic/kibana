/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  EuiSpacer,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiFilterGroup,
  EuiFilterButton,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage, FormattedDate } from '@kbn/i18n-react';
import type { SendRequestResponse } from '@kbn/es-ui-shared-plugin/public/request/send_request';

import { ApiKeyField } from '../../../../../components/api_key_field';

import type { GetOneEnrollmentAPIKeyResponse } from '../../../../../../common/types';
import {
  ENROLLMENT_API_KEYS_INDEX,
  SO_SEARCH_LIMIT,
  FLEET_ENROLLMENT_API_PREFIX,
} from '../../../constants';
import { NewEnrollmentTokenModal } from '../../../components';
import {
  useBreadcrumbs,
  usePagination,
  useGetEnrollmentAPIKeysQuery,
  useGetAgentPolicies,
  sendGetOneEnrollmentAPIKey,
  useStartServices,
  sendDeleteOneEnrollmentAPIKey,
  sendBulkDeleteEnrollmentAPIKeys,
} from '../../../hooks';
import type { EnrollmentAPIKey, GetAgentPoliciesResponseItem } from '../../../types';
import { SearchBar } from '../../../components/search_bar';
import { DefaultLayout } from '../../../layouts';
import { AgentPolicyFilter } from '../agent_list_page/components/filter_bar/agent_policy_filter';

import { HierarchicalActionsMenu } from '../components';
import type { MenuItem } from '../components';

import { ConfirmEnrollmentTokenDelete } from './components/confirm_delete_modal';
import { ConfirmBulkActionModal } from './components/confirm_bulk_action_modal';

type SelectionMode = 'manual' | 'query';
type BulkAction = 'delete' | 'revoke';
type ActiveFilter = 'active' | 'inactive' | 'all';
type TokenActionType = 'revoke' | 'delete';

const Divider: React.FunctionComponent = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        width: 0,
        height: euiTheme.size.l,
        borderLeft: euiTheme.border.thin,
      }}
    />
  );
};

const TokenActions: React.FunctionComponent<{ apiKey: EnrollmentAPIKey; refresh: () => void }> = ({
  apiKey,
  refresh,
}) => {
  const { notifications } = useStartServices();
  const [pendingAction, setPendingAction] = useState<TokenActionType | null>(null);

  const onCancelAction = () => setPendingAction(null);

  const onConfirmRevoke = async () => {
    try {
      const res = await sendDeleteOneEnrollmentAPIKey(apiKey.id);
      if (res.error) throw res.error;
    } catch (err) {
      notifications.toasts.addError(err as Error, { title: 'Error' });
    }
    setPendingAction(null);
    refresh();
  };

  const onConfirmDelete = async () => {
    try {
      const res = await sendBulkDeleteEnrollmentAPIKeys({
        tokenIds: [apiKey.id],
        forceDelete: true,
      });
      if (res.error) throw res.error;
    } catch (err) {
      notifications.toasts.addError(err as Error, { title: 'Error' });
    }
    setPendingAction(null);
    refresh();
  };

  const menuItems: MenuItem[] = [
    {
      id: 'revoke',
      name: i18n.translate('xpack.fleet.enrollmentTokensList.revokeTokenAction', {
        defaultMessage: 'Revoke token',
      }),
      icon: 'minusInCircle',
      disabled: !apiKey.active,
      'data-test-subj': 'enrollmentTokenTable.revokeBtn',
      onClick: () => setPendingAction('revoke'),
    },
    {
      id: 'delete',
      name: i18n.translate('xpack.fleet.enrollmentTokensList.deleteTokenAction', {
        defaultMessage: 'Delete token',
      }),
      icon: 'trash',
      'data-test-subj': 'enrollmentTokenTable.deleteBtn',
      onClick: () => setPendingAction('delete'),
    },
  ];

  return (
    <>
      {pendingAction === 'revoke' && (
        <ConfirmEnrollmentTokenDelete
          enrollmentKey={apiKey}
          onCancel={onCancelAction}
          onConfirm={onConfirmRevoke}
        />
      )}
      {pendingAction === 'delete' && (
        <ConfirmBulkActionModal
          action="delete"
          count={1}
          onCancel={onCancelAction}
          onConfirm={onConfirmDelete}
        />
      )}
      <HierarchicalActionsMenu
        items={menuItems}
        data-test-subj="enrollmentTokenTable.actionsMenu"
      />
    </>
  );
};

const NOT_HIDDEN_KUERY = 'not hidden:true';

function buildKuery(
  search: string,
  selectedPolicyIds: string[],
  activeFilter: ActiveFilter
): string {
  const parts: string[] = [];

  if (search.trim() !== '') {
    parts.push(`(${search.trim()})`);
  }

  if (selectedPolicyIds.length > 0) {
    const policyFilter = selectedPolicyIds.map((id) => `policy_id:"${id}"`).join(' or ');
    parts.push(`(${policyFilter})`);
  }

  if (activeFilter === 'active') {
    parts.push('(active:true)');
  } else if (activeFilter === 'inactive') {
    parts.push('(active:false)');
  }

  parts.push(`(${NOT_HIDDEN_KUERY})`);

  return parts.join(' and ');
}

export const EnrollmentTokenListPage: React.FunctionComponent<{}> = () => {
  useBreadcrumbs('enrollment_tokens');
  const { notifications } = useStartServices();
  const { euiTheme } = useEuiTheme();
  const [isModalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const { pagination, setPagination, pageSizeOptions } = usePagination();

  const [selectedTokens, setSelectedTokens] = useState<EnrollmentAPIKey[]>([]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('manual');
  const [bulkActionPending, setBulkActionPending] = useState<BulkAction | null>(null);

  const kuery = buildKuery(search, selectedPolicyIds, activeFilter);

  const enrollmentAPIKeysRequest = useGetEnrollmentAPIKeysQuery({
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    kuery,
  });
  const agentPoliciesRequest = useGetAgentPolicies({
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });

  const agentPolicies = agentPoliciesRequest.data ? agentPoliciesRequest.data.items : [];
  const agentPoliciesById = agentPolicies.reduce(
    (acc: { [key: string]: GetAgentPoliciesResponseItem }, policy) => {
      acc[policy.id] = policy;
      return acc;
    },
    {}
  );

  const visibleAgentPolicies = agentPolicies.filter((p) => !p.is_managed && !p.supports_agentless);

  const total = enrollmentAPIKeysRequest?.data?.total ?? 0;
  const rowItems =
    enrollmentAPIKeysRequest?.data?.items.filter((enrollmentKey) => {
      if (!agentPolicies.length || !enrollmentKey.policy_id) return false;
      const agentPolicy = agentPoliciesById[enrollmentKey.policy_id];
      return !agentPolicy?.is_managed && !agentPolicy?.supports_agentless;
    }) || [];

  const selectedCount = selectionMode === 'query' ? total : selectedTokens.length;
  const showSelectionInfo =
    (selectionMode === 'manual' && selectedTokens.length > 0) ||
    (selectionMode === 'query' && total > 0);
  const showSelectEverything =
    selectionMode === 'manual' &&
    selectedTokens.length === rowItems.length &&
    rowItems.length < total;

  const clearSelection = () => {
    setSelectedTokens([]);
    setSelectionMode('manual');
  };

  const refresh = () => {
    clearSelection();
    enrollmentAPIKeysRequest.refetch();
  };

  const onBulkActionConfirm = async () => {
    const action = bulkActionPending!;
    setBulkActionPending(null);

    const body =
      selectionMode === 'query'
        ? { kuery, forceDelete: action === 'delete' }
        : { tokenIds: selectedTokens.map((t) => t.id), forceDelete: action === 'delete' };

    try {
      const res = await sendBulkDeleteEnrollmentAPIKeys(body);
      if (res.error) throw res.error;
      notifications.toasts.addSuccess(
        action === 'delete'
          ? i18n.translate('xpack.fleet.enrollmentTokensList.bulkDeleteSuccess', {
              defaultMessage:
                '{count, plural, one {# enrollment token deleted} other {# enrollment tokens deleted}}',
              values: { count: res.data?.count ?? selectedCount },
            })
          : i18n.translate('xpack.fleet.enrollmentTokensList.bulkRevokeSuccess', {
              defaultMessage:
                '{count, plural, one {# enrollment token revoked} other {# enrollment tokens revoked}}',
              values: { count: res.data?.count ?? selectedCount },
            })
      );
    } catch (err) {
      notifications.toasts.addError(err as Error, { title: 'Error' });
    }

    refresh();
  };

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.fleet.enrollmentTokensList.nameTitle', {
        defaultMessage: 'Name',
      }),
      render: (value: string) => value,
    },
    {
      field: 'id',
      name: i18n.translate('xpack.fleet.enrollmentTokensList.secretTitle', {
        defaultMessage: 'Secret',
      }),
      width: '285px',
      render: (apiKeyId: string) => {
        return (
          <ApiKeyField
            apiKeyId={apiKeyId}
            sendGetAPIKey={sendGetOneEnrollmentAPIKey}
            tokenGetter={(response: SendRequestResponse<GetOneEnrollmentAPIKeyResponse>) =>
              response.data?.item.api_key
            }
            length={60}
          />
        );
      },
    },
    {
      field: 'policy_id',
      name: i18n.translate('xpack.fleet.enrollmentTokensList.policyTitle', {
        defaultMessage: 'Agent policy',
      }),
      render: (policyId: string) => {
        const agentPolicy = agentPoliciesById[policyId];
        const value = agentPolicy ? agentPolicy.name : policyId;
        return (
          <span className="eui-textTruncate" title={value}>
            {value}
          </span>
        );
      },
    },
    {
      field: 'created_at',
      name: i18n.translate('xpack.fleet.enrollmentTokensList.createdAtTitle', {
        defaultMessage: 'Created on',
      }),
      width: '150px',
      render: (createdAt: string) => {
        return createdAt ? (
          <FormattedDate year="numeric" month="short" day="2-digit" value={createdAt} />
        ) : null;
      },
    },
    {
      field: 'actions',
      name: i18n.translate('xpack.fleet.enrollmentTokensList.actionsTitle', {
        defaultMessage: 'Actions',
      }),
      width: '70px',
      render: (_: unknown, apiKey: EnrollmentAPIKey) => {
        const agentPolicy = agentPolicies.find((c) => c.id === apiKey.policy_id);
        if (agentPolicy?.is_managed) return null;
        return <TokenActions apiKey={apiKey} refresh={() => enrollmentAPIKeysRequest.refetch()} />;
      },
    },
  ];

  const isLoading =
    enrollmentAPIKeysRequest.isInitialLoading ||
    (agentPoliciesRequest.isLoading && agentPoliciesRequest.isInitialRequest);

  return (
    <DefaultLayout section="enrollment_tokens">
      {isModalOpen && (
        <NewEnrollmentTokenModal
          agentPolicies={agentPolicies}
          onClose={() => {
            setModalOpen(false);
            enrollmentAPIKeysRequest.refetch();
          }}
        />
      )}
      {bulkActionPending && (
        <ConfirmBulkActionModal
          action={bulkActionPending}
          count={selectedCount}
          onCancel={() => setBulkActionPending(null)}
          onConfirm={onBulkActionConfirm}
        />
      )}
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.fleet.enrollmentTokensList.pageDescription"
          defaultMessage="Create and revoke enrollment tokens. An enrollment token enables one or more agents to enroll in Fleet and send data."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <SearchBar
                value={search}
                indexPattern={ENROLLMENT_API_KEYS_INDEX}
                fieldPrefix={FLEET_ENROLLMENT_API_PREFIX}
                onChange={(newSearch) => {
                  setPagination({ ...pagination, currentPage: 1 });
                  clearSelection();
                  setSearch(newSearch);
                }}
                dataTestSubj="enrollmentKeysList.queryInput"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <AgentPolicyFilter
                  selectedAgentPolicies={selectedPolicyIds}
                  onSelectedAgentPoliciesChange={(ids) => {
                    setPagination({ ...pagination, currentPage: 1 });
                    clearSelection();
                    setSelectedPolicyIds(ids);
                  }}
                  agentPolicies={visibleAgentPolicies}
                />
                <EuiFilterButton
                  isToggle
                  isSelected={activeFilter === 'active'}
                  withNext
                  onClick={() => {
                    setPagination({ ...pagination, currentPage: 1 });
                    clearSelection();
                    setActiveFilter(activeFilter === 'active' ? 'all' : 'active');
                  }}
                  data-test-subj="enrollmentTokensList.filterActive"
                >
                  <FormattedMessage
                    id="xpack.fleet.enrollmentTokensList.filterActive"
                    defaultMessage="Active"
                  />
                </EuiFilterButton>
                <EuiFilterButton
                  isToggle
                  isSelected={activeFilter === 'inactive'}
                  onClick={() => {
                    setPagination({ ...pagination, currentPage: 1 });
                    clearSelection();
                    setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive');
                  }}
                  data-test-subj="enrollmentTokensList.filterInactive"
                >
                  <FormattedMessage
                    id="xpack.fleet.enrollmentTokensList.filterInactive"
                    defaultMessage="Inactive"
                  />
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
            {showSelectionInfo && (
              <EuiFlexItem grow={false}>
                <HierarchicalActionsMenu
                  items={[
                    {
                      id: 'bulkRevoke',
                      name: i18n.translate(
                        'xpack.fleet.enrollmentTokensList.bulkRevokeButton',
                        { defaultMessage: 'Revoke' }
                      ),
                      icon: 'minusInCircle',
                      iconColor: 'danger',
                      'data-test-subj': 'enrollmentTokensList.bulkRevokeButton',
                      onClick: () => setBulkActionPending('revoke'),
                    },
                    {
                      id: 'bulkDelete',
                      name: i18n.translate(
                        'xpack.fleet.enrollmentTokensList.bulkDeleteButton',
                        { defaultMessage: 'Delete' }
                      ),
                      icon: 'trash',
                      iconColor: 'danger',
                      'data-test-subj': 'enrollmentTokensList.bulkDeleteButton',
                      onClick: () => setBulkActionPending('delete'),
                    },
                  ]}
                  button={{
                    props: { iconType: 'arrowDown', iconSide: 'right' },
                    children: i18n.translate(
                      'xpack.fleet.enrollmentTokensList.bulkActionsButton',
                      {
                        defaultMessage:
                          '{count, plural, one {# token} other {# tokens}} selected',
                        values: { count: selectedCount },
                      }
                    ),
                  }}
                  data-test-subj="enrollmentTokensList.bulkActionsMenu"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="createEnrollmentTokenButton"
            fill
            iconType="plusCircle"
            onClick={() => setModalOpen(true)}
          >
            <FormattedMessage
              id="xpack.fleet.enrollmentTokensList.newKeyButton"
              defaultMessage="Create enrollment token"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" style={{ minHeight: euiTheme.size.xl }}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.fleet.enrollmentTokensList.totalTokens"
              defaultMessage="Showing {count, plural, one {# token} other {# tokens}}"
              values={{ count: total }}
            />
          </EuiText>
        </EuiFlexItem>
        {showSelectionInfo && (
          <>
            <EuiFlexItem grow={false}>
              <Divider />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="selectedTokenCountLabel">
                <FormattedMessage
                  id="xpack.fleet.enrollmentTokensList.tokensSelected"
                  defaultMessage="{selectionMode, select,
                    manual {{count, plural, one {# token} other {# tokens}}}
                    other {All tokens}
                  } selected"
                  values={{ selectionMode, count: selectedTokens.length }}
                />
              </EuiText>
            </EuiFlexItem>
          </>
        )}
        {showSelectEverything && (
          <>
            <EuiFlexItem grow={false}>
              <Divider />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="both"
                onClick={() => setSelectionMode('query')}
                data-test-subj="enrollmentTokensList.selectAllButton"
              >
                <FormattedMessage
                  id="xpack.fleet.enrollmentTokensList.selectAllButton"
                  defaultMessage="Select everything on all pages"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
        {showSelectionInfo && (
          <>
            <EuiFlexItem grow={false}>
              <Divider />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="both"
                onClick={clearSelection}
                data-test-subj="enrollmentTokensList.clearSelectionButton"
              >
                <FormattedMessage
                  id="xpack.fleet.enrollmentTokensList.clearSelectionButton"
                  defaultMessage="Clear selection"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable<EnrollmentAPIKey>
        data-test-subj="enrollmentTokenListTable"
        tableCaption={i18n.translate(
          'xpack.fleet.enrollmentTokensList.enrollmentTokens.tableCaption',
          {
            defaultMessage: 'List of enrollment tokens',
          }
        )}
        loading={isLoading}
        noItemsMessage={
          isLoading ? (
            <FormattedMessage
              id="xpack.fleet.enrollemntAPIKeyList.loadingTokensMessage"
              defaultMessage="Loading enrollment tokens..."
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.enrollemntAPIKeyList.emptyMessage"
              defaultMessage="No enrollment tokens found."
            />
          )
        }
        items={total ? rowItems : []}
        itemId="id"
        columns={columns}
        rowProps={(item: EnrollmentAPIKey) => ({
          style: !item.active ? { color: euiTheme.colors.subduedText } : undefined,
        })}
        selection={{
          selected: selectionMode === 'query' ? rowItems : selectedTokens,
          onSelectionChange: (items: EnrollmentAPIKey[]) => {
            setSelectionMode('manual');
            setSelectedTokens(items);
          },
        }}
        pagination={{
          pageIndex: pagination.currentPage - 1,
          pageSize: pagination.pageSize,
          totalItemCount: total,
          pageSizeOptions,
        }}
        onChange={({ page }: { page: { index: number; size: number } }) => {
          setPagination({
            ...pagination,
            currentPage: page.index + 1,
            pageSize: page.size,
          });
        }}
      />
    </DefaultLayout>
  );
};
