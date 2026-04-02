/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
  type EuiTableSelectionType,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  CreateNotificationPolicyData,
  NotificationPolicyBulkAction,
  NotificationPolicyResponse,
} from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import React, { useCallback, useState } from 'react';
import { DeleteNotificationPolicyConfirmModal } from '../../components/notification_policy/delete_confirmation_modal';
import { NotificationPolicyDestinationsSummary } from '../../components/notification_policy/notification_policy_destinations_summary';
import { NotificationPolicySnoozePopover } from '../../components/notification_policy/notification_policy_snooze_popover';
import { NotificationPolicyStateBadge } from '../../components/notification_policy/notification_policy_state_badge';
import { paths } from '../../constants';
import { useBulkActionNotificationPolicies } from '../../hooks/use_bulk_action_notification_policies';
import { useCreateNotificationPolicy } from '../../hooks/use_create_notification_policy';
import { useDeleteNotificationPolicy } from '../../hooks/use_delete_notification_policy';
import { useDisableNotificationPolicy } from '../../hooks/use_disable_notification_policy';
import { useEnableNotificationPolicy } from '../../hooks/use_enable_notification_policy';
import { useFetchNotificationPolicies } from '../../hooks/use_fetch_notification_policies';
import { useSnoozeNotificationPolicy } from '../../hooks/use_snooze_notification_policy';
import { useUnsnoozeNotificationPolicy } from '../../hooks/use_unsnooze_notification_policy';
import { useUpdateNotificationPolicyApiKey } from '../../hooks/use_update_notification_policy_api_key';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { NotificationPoliciesBulkActions } from './components/notification_policies_bulk_actions';
import { NotificationPoliciesSearchBar } from './components/notification_policies_search_bar';
import { NotificationPolicyActionsCell } from './components/notification_policy_actions_cell';
import { UpdateApiKeyConfirmationModal } from './components/update_api_key_confirmation_modal';

const DEFAULT_PER_PAGE = 20;

const descriptionTextStyle = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

export const ListNotificationPoliciesPage = () => {
  useBreadcrumbs('notification_policies_list');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [search, setSearch] = useState('');
  const [enabled, setEnabled] = useState('');
  const [sortField, setSortField] = useState<'name' | 'updatedAt' | 'updatedByUsername'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [policyToDelete, setPolicyToDelete] = useState<NotificationPolicyResponse | null>(null);
  const [policyToUpdateApiKey, setPolicyToUpdateApiKey] = useState<string | null>(null);
  const [selectedPolicies, setSelectedPolicies] = useState<NotificationPolicyResponse[]>([]);

  const { euiTheme } = useEuiTheme();
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));
  const settings = useService(CoreStart('settings'));
  const dateTimeFormat = settings.client.get<string>('dateFormat');

  const { mutate: createNotificationPolicy } = useCreateNotificationPolicy();
  const { mutate: deleteNotificationPolicy, isLoading: isDeleting } = useDeleteNotificationPolicy();
  const {
    mutate: enablePolicy,
    isLoading: isEnabling,
    variables: enableVariables,
  } = useEnableNotificationPolicy();
  const {
    mutate: disablePolicy,
    isLoading: isDisabling,
    variables: disableVariables,
  } = useDisableNotificationPolicy();
  const {
    mutate: snoozePolicy,
    isLoading: isSnoozing,
    variables: snoozeVariables,
  } = useSnoozeNotificationPolicy();
  const {
    mutate: unsnoozePolicy,
    isLoading: isUnsnoozing,
    variables: unsnoozeVariables,
  } = useUnsnoozeNotificationPolicy();

  const { mutate: updateApiKey, isLoading: isUpdatingApiKey } = useUpdateNotificationPolicyApiKey();

  const { mutate: bulkAction, isLoading: isBulkActionInProgress } =
    useBulkActionNotificationPolicies();

  const clearSelection = useCallback(() => {
    setSelectedPolicies([]);
  }, []);

  const navigateToCreate = () => {
    navigateToUrl(basePath.prepend(paths.notificationPolicyCreate));
  };

  const navigateToEdit = (id: string) => {
    navigateToUrl(basePath.prepend(paths.notificationPolicyEdit(id)));
  };

  const clonePolicy = (policy: NotificationPolicyResponse) => {
    const { name, description, destinations, matcher, groupBy, throttle } = policy;
    const data: CreateNotificationPolicyData = {
      name: `${name} [clone]`,
      description,
      destinations,
      ...(matcher != null && { matcher }),
      ...(groupBy != null && { groupBy }),
      ...(throttle != null && { throttle }),
    };
    createNotificationPolicy(data);
  };

  const { data, isError, error, isFetching } = useFetchNotificationPolicies({
    page: page + 1,
    perPage,
    search: search || undefined,
    enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
    sortField,
    sortOrder: sortDirection,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const handleEnabledChange = useCallback((value: string) => {
    setEnabled(value);
    setPage(0);
  }, []);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const onTableChange = ({
    page: tablePage,
    sort,
  }: CriteriaWithPagination<NotificationPolicyResponse>) => {
    if (tablePage) {
      setPage(tablePage.index);
      setPerPage(tablePage.size);
    }

    if (sort) {
      setSortField(sort.field as 'name' | 'updatedAt' | 'updatedByUsername');
      setSortDirection(sort.direction);
    }
  };

  const pagination = {
    pageIndex: page,
    pageSize: perPage,
    totalItemCount: total,
    pageSizeOptions: [10, 20, 50],
  };

  const hasSelection = selectedPolicies.length > 0;

  const handleBulkAction = (
    action: 'enable' | 'disable' | 'delete' | 'snooze' | 'unsnooze' | 'update_api_key',
    snoozedUntil?: string
  ) => {
    const ids = selectedPolicies.map((policy) => policy.id);
    let actions: NotificationPolicyBulkAction[];
    if (action === 'snooze' && snoozedUntil) {
      actions = ids.map((id) => ({ id, action: 'snooze', snoozedUntil }));
    } else if (action === 'enable') {
      actions = ids.map((id) => ({ id, action: 'enable' }));
    } else if (action === 'disable') {
      actions = ids.map((id) => ({ id, action: 'disable' }));
    } else if (action === 'unsnooze') {
      actions = ids.map((id) => ({ id, action: 'unsnooze' }));
    } else if (action === 'delete') {
      actions = ids.map((id) => ({ id, action: 'delete' }));
    } else if (action === 'update_api_key') {
      actions = ids.map((id) => ({ id, action: 'update_api_key' }));
    } else {
      throw new Error(`Invalid action: ${action}`);
    }

    bulkAction({ actions }, { onSuccess: clearSelection });
  };

  const onSelectionChange = (newSelectedItems: NotificationPolicyResponse[]) => {
    setSelectedPolicies(newSelectedItems);
  };

  const selection: EuiTableSelectionType<NotificationPolicyResponse> = {
    onSelectionChange,
    selectable: () => {
      return !isBulkActionInProgress;
    },
    selected: selectedPolicies,
  };

  const columns: Array<EuiBasicTableColumn<NotificationPolicyResponse>> = [
    {
      field: 'name',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.name"
          defaultMessage="Name"
        />
      ),
      sortable: true,
      render: (name: string, policy: NotificationPolicyResponse) => (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>{name}</EuiFlexItem>
          {policy.description && (
            <EuiText size="xs" color="subdued" css={descriptionTextStyle}>
              {policy.description}
            </EuiText>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'destinations',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.destinations"
          defaultMessage="Destinations"
        />
      ),
      render: (destinations: NotificationPolicyResponse['destinations']) => (
        <NotificationPolicyDestinationsSummary destinations={destinations} />
      ),
    },
    {
      field: 'updatedAt',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.updatedAt"
          defaultMessage="Last update"
        />
      ),
      sortable: true,
      render: (updatedAt: string) => moment(updatedAt).format(dateTimeFormat),
    },
    {
      field: 'updatedByUsername',
      sortable: true,
      width: '200px',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.updatedByUsername"
          defaultMessage="Updated by"
        />
      ),
    },
    {
      field: 'enabled',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.state"
          defaultMessage="State"
        />
      ),
      width: '120px',
      render: (_enabled: boolean, policy: NotificationPolicyResponse) => (
        <NotificationPolicyStateBadge
          policy={policy}
          isLoading={
            (isEnabling && enableVariables === policy.id) ||
            (isDisabling && disableVariables === policy.id)
          }
        />
      ),
    },
    {
      field: 'snoozedUntil',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.notify"
          defaultMessage="Notify"
        />
      ),
      width: '120px',
      render: (_snoozedUntil: string | undefined, policy: NotificationPolicyResponse) => {
        if (!policy.enabled) {
          return null;
        }
        return (
          <NotificationPolicySnoozePopover
            policy={policy}
            onSnooze={(id, until) => snoozePolicy({ id, snoozedUntil: until })}
            onCancelSnooze={(id) => unsnoozePolicy(id)}
            isLoading={
              (isSnoozing && snoozeVariables?.id === policy.id) ||
              (isUnsnoozing && unsnoozeVariables === policy.id)
            }
            isDisabled={hasSelection}
          />
        );
      },
    },
    {
      name: i18n.translate('xpack.alertingV2.notificationPoliciesList.column.actions', {
        defaultMessage: 'Actions',
      }),
      width: '120px',
      render: (policy: NotificationPolicyResponse) => (
        <NotificationPolicyActionsCell
          policy={policy}
          onEdit={navigateToEdit}
          onClone={clonePolicy}
          onDelete={setPolicyToDelete}
          onEnable={(id) => enablePolicy(id)}
          onDisable={(id) => disablePolicy(id)}
          onSnooze={(id, until) => snoozePolicy({ id, snoozedUntil: until })}
          onCancelSnooze={(id) => unsnoozePolicy(id)}
          onUpdateApiKey={(id) => setPolicyToUpdateApiKey(id)}
          isStateLoading={
            (isEnabling && enableVariables === policy.id) ||
            (isDisabling && disableVariables === policy.id)
          }
          isDisabled={hasSelection}
        />
      ),
    },
  ];

  const errorMessage = isError && error ? error.message : null;

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.notificationPoliciesList.pageTitle"
            defaultMessage="Notification Policies"
          />
        }
        rightSideItems={[
          <EuiButton key="create-policy" onClick={navigateToCreate} fill>
            <FormattedMessage
              id="xpack.alertingV2.notificationPoliciesList.createPolicyButton"
              defaultMessage="Create policy"
            />
          </EuiButton>,
        ]}
      />
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        <EuiSpacer size="m" />
        <EuiFlexItem grow={false}>
          <NotificationPoliciesSearchBar
            onSearchChange={handleSearchChange}
            enabled={enabled}
            onEnabledChange={handleEnabledChange}
          />
        </EuiFlexItem>
        {errorMessage ? (
          <>
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.alertingV2.notificationPoliciesList.loadErrorTitle"
                  defaultMessage="Failed to load notification policies"
                />
              }
              color="danger"
              iconType="error"
            >
              {errorMessage}
            </EuiCallOut>
            <EuiSpacer />
          </>
        ) : null}
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          {total > 0 && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <FormattedMessage
                      id="xpack.alertingV2.notificationPoliciesList.showingLabel"
                      defaultMessage="Showing {rangeBold} of {totalBold}"
                      values={{
                        rangeBold: (
                          <strong>
                            {Math.min(page * perPage + 1, total)}-
                            {Math.min((page + 1) * perPage, total)}
                          </strong>
                        ),
                        totalBold: (
                          <strong>
                            <FormattedMessage
                              id="xpack.alertingV2.notificationPoliciesList.showingLabelTotal"
                              defaultMessage="{total} {total, plural, one {notification policy} other {notification policies}}"
                              values={{ total }}
                            />
                          </strong>
                        ),
                      }}
                    />
                  </EuiText>
                </EuiFlexItem>
                {hasSelection && (
                  <EuiFlexItem grow={false}>
                    <NotificationPoliciesBulkActions
                      selectedPolicies={selectedPolicies}
                      onClearSelection={clearSelection}
                      onBulkAction={handleBulkAction}
                      isLoading={isBulkActionInProgress}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          <EuiBasicTable
            items={items}
            columns={columns}
            itemId="id"
            selection={selection}
            loading={isFetching}
            pagination={pagination}
            responsiveBreakpoint={false}
            css={css`
              .euiTableHeaderMobile .euiCheckbox {
                display: none;
              }
              .euiTableRowCellCheckbox {
                vertical-align: top;
                padding-top: ${euiTheme.size.xs};
              }
            `}
            sorting={{
              sort: {
                field: sortField,
                direction: sortDirection,
              },
            }}
            onChange={onTableChange}
            tableCaption={i18n.translate('xpack.alertingV2.notificationPoliciesList.tableCaption', {
              defaultMessage: 'Notification Policies',
            })}
          />
        </EuiFlexGroup>
      </EuiFlexGroup>

      {policyToDelete && (
        <DeleteNotificationPolicyConfirmModal
          policyName={policyToDelete.name}
          onCancel={() => setPolicyToDelete(null)}
          onConfirm={() => {
            deleteNotificationPolicy(policyToDelete.id, {
              onSuccess: () => setPolicyToDelete(null),
            });
          }}
          isLoading={isDeleting}
        />
      )}

      {policyToUpdateApiKey && (
        <UpdateApiKeyConfirmationModal
          count={1}
          onCancel={() => setPolicyToUpdateApiKey(null)}
          onConfirm={() => {
            updateApiKey(policyToUpdateApiKey, {
              onSuccess: () => setPolicyToUpdateApiKey(null),
            });
          }}
          isLoading={isUpdatingApiKey}
        />
      )}
    </>
  );
};
