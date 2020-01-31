/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment, useEffect, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';

import { AlertsContextProvider } from '../../../context/alerts_context';
import { useAppDependencies } from '../../../app_context';
import { ActionType, Alert, AlertTableItem, AlertTypeIndex, Pagination } from '../../../../types';
import { AlertAdd } from '../../alert_add';
import { BulkActionPopover } from './bulk_action_popover';
import { CollapsedItemActions } from './collapsed_item_actions';
import { TypeFilter } from './type_filter';
import { ActionTypeFilter } from './action_type_filter';
import { loadAlerts, loadAlertTypes } from '../../../lib/alert_api';
import { loadActionTypes } from '../../../lib/action_connector_api';
import { hasDeleteAlertsCapability, hasSaveAlertsCapability } from '../../../lib/capabilities';

const ENTER_KEY = 13;

interface AlertTypeState {
  isLoading: boolean;
  isInitialized: boolean;
  data: AlertTypeIndex;
}
interface AlertState {
  isLoading: boolean;
  data: Alert[];
  totalItemCount: number;
}

export const AlertsList: React.FunctionComponent = () => {
  const { http, injectedMetadata, toastNotifications, capabilities } = useAppDependencies();
  const canDelete = hasDeleteAlertsCapability(capabilities);
  const canSave = hasSaveAlertsCapability(capabilities);
  const createAlertUiEnabled = injectedMetadata.getInjectedVar('createAlertUiEnabled');

  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);
  const [page, setPage] = useState<Pagination>({ index: 0, size: 10 });
  const [searchText, setSearchText] = useState<string | undefined>();
  const [inputText, setInputText] = useState<string | undefined>();
  const [typesFilter, setTypesFilter] = useState<string[]>([]);
  const [actionTypesFilter, setActionTypesFilter] = useState<string[]>([]);
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);
  const [alertTypesState, setAlertTypesState] = useState<AlertTypeState>({
    isLoading: false,
    isInitialized: false,
    data: {},
  });
  const [alertsState, setAlertsState] = useState<AlertState>({
    isLoading: false,
    data: [],
    totalItemCount: 0,
  });

  useEffect(() => {
    loadAlertsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchText, typesFilter, actionTypesFilter]);

  useEffect(() => {
    (async () => {
      try {
        setAlertTypesState({ ...alertTypesState, isLoading: true });
        const alertTypes = await loadAlertTypes({ http });
        const index: AlertTypeIndex = {};
        for (const alertType of alertTypes) {
          index[alertType.id] = alertType;
        }
        setAlertTypesState({ isLoading: false, data: index, isInitialized: true });
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsList.unableToLoadAlertTypesMessage',
            { defaultMessage: 'Unable to load alert types' }
          ),
        });
        setAlertTypesState({ ...alertTypesState, isLoading: false });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await loadActionTypes({ http });
        setActionTypes(result);
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsList.unableToLoadActionTypesMessage',
            { defaultMessage: 'Unable to load action types' }
          ),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAlertsData() {
    setAlertsState({ ...alertsState, isLoading: true });
    try {
      const alertsResponse = await loadAlerts({
        http,
        page,
        searchText,
        typesFilter,
        actionTypesFilter,
      });
      setAlertsState({
        isLoading: false,
        data: alertsResponse.data,
        totalItemCount: alertsResponse.total,
      });
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.unableToLoadAlertsMessage',
          {
            defaultMessage: 'Unable to load alerts',
          }
        ),
      });
      setAlertsState({ ...alertsState, isLoading: false });
    }
  }

  const alertsTableColumns = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.nameTitle',
        { defaultMessage: 'Name' }
      ),
      sortable: false,
      truncateText: true,
      'data-test-subj': 'alertsTableCell-name',
    },
    {
      field: 'tagsText',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.tagsText',
        { defaultMessage: 'Tags' }
      ),
      sortable: false,
      'data-test-subj': 'alertsTableCell-tagsText',
    },
    {
      field: 'alertType',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.alertTypeTitle',
        { defaultMessage: 'Type' }
      ),
      sortable: false,
      truncateText: true,
      'data-test-subj': 'alertsTableCell-alertType',
    },
    {
      field: 'schedule.interval',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.intervalTitle',
        { defaultMessage: 'Runs every' }
      ),
      sortable: false,
      truncateText: false,
      'data-test-subj': 'alertsTableCell-interval',
    },
    {
      name: '',
      width: '40px',
      render(item: AlertTableItem) {
        return (
          <CollapsedItemActions key={item.id} item={item} onAlertChanged={() => loadAlertsData()} />
        );
      },
    },
  ];

  const toolsRight = [
    <TypeFilter
      key="type-filter"
      onChange={(types: string[]) => setTypesFilter(types)}
      options={Object.values(alertTypesState.data)
        .map(alertType => ({
          value: alertType.id,
          name: alertType.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))}
    />,
    <ActionTypeFilter
      key="action-type-filter"
      actionTypes={actionTypes}
      onChange={(ids: string[]) => setActionTypesFilter(ids)}
    />,
  ];

  if (canSave && createAlertUiEnabled) {
    toolsRight.push(
      <EuiButton
        key="create-alert"
        data-test-subj="createAlertButton"
        fill
        iconType="plusInCircle"
        iconSide="left"
        onClick={() => setAlertFlyoutVisibility(true)}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.alertsList.addActionButtonLabel"
          defaultMessage="Create"
        />
      </EuiButton>
    );
  }

  return (
    <section data-test-subj="alertsList">
      <Fragment>
        <EuiSpacer size="m" />
        <AlertsContextProvider value={{ alertFlyoutVisible, setAlertFlyoutVisibility }}>
          <EuiFlexGroup>
            {selectedIds.length > 0 && canDelete && (
              <EuiFlexItem grow={false}>
                <BulkActionPopover
                  selectedItems={convertAlertsToTableItems(
                    filterAlertsById(alertsState.data, selectedIds),
                    alertTypesState.data
                  )}
                  onPerformingAction={() => setIsPerformingAction(true)}
                  onActionPerformed={() => {
                    loadAlertsData();
                    setIsPerformingAction(false);
                  }}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiFieldText
                fullWidth
                data-test-subj="alertSearchField"
                prepend={<EuiIcon type="search" />}
                onChange={e => setInputText(e.target.value)}
                onKeyUp={e => {
                  if (e.keyCode === ENTER_KEY) {
                    setSearchText(inputText);
                  }
                }}
                placeholder={i18n.translate(
                  'xpack.triggersActionsUI.sections.alertsList.searchPlaceholderTitle',
                  { defaultMessage: 'Search...' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                {toolsRight.map((tool, index: number) => (
                  <EuiFlexItem key={index} grow={false}>
                    {tool}
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          {/* Large to remain consistent with ActionsList table spacing */}
          <EuiSpacer size="l" />

          <EuiBasicTable
            loading={alertsState.isLoading || alertTypesState.isLoading || isPerformingAction}
            /* Don't display alerts until we have the alert types initialized */
            items={
              alertTypesState.isInitialized === false
                ? []
                : convertAlertsToTableItems(alertsState.data, alertTypesState.data)
            }
            itemId="id"
            columns={alertsTableColumns}
            rowProps={() => ({
              'data-test-subj': 'alert-row',
            })}
            cellProps={() => ({
              'data-test-subj': 'cell',
            })}
            data-test-subj="alertsList"
            pagination={{
              pageIndex: page.index,
              pageSize: page.size,
              /* Don't display alert count until we have the alert types initialized */
              totalItemCount:
                alertTypesState.isInitialized === false ? 0 : alertsState.totalItemCount,
            }}
            selection={
              canDelete
                ? {
                    onSelectionChange(updatedSelectedItemsList: AlertTableItem[]) {
                      setSelectedIds(updatedSelectedItemsList.map(item => item.id));
                    },
                  }
                : undefined
            }
            onChange={({ page: changedPage }: { page: Pagination }) => {
              setPage(changedPage);
            }}
          />
          <AlertAdd refreshList={loadAlertsData} />
        </AlertsContextProvider>
      </Fragment>
    </section>
  );
};

function filterAlertsById(alerts: Alert[], ids: string[]): Alert[] {
  return alerts.filter(alert => ids.includes(alert.id));
}

function convertAlertsToTableItems(alerts: Alert[], alertTypesIndex: AlertTypeIndex) {
  return alerts.map(alert => ({
    ...alert,
    tagsText: alert.tags.join(', '),
    alertType: alertTypesIndex[alert.alertTypeId]?.name ?? alert.alertTypeId,
  }));
}
