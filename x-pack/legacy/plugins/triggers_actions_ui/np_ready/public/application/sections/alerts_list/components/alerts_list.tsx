/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment, useEffect, useState } from 'react';
// @ts-ignore: EuiSearchBar not exported in TypeScript
import { EuiBasicTable, EuiButton, EuiFilterButton, EuiSearchBar, EuiSpacer } from '@elastic/eui';

import { AlertsContext } from '../../../context/alerts_context';
import { useAppDependencies } from '../../../app_dependencies';
import { ActionType, Alert, AlertTableItem, AlertTypeIndex, Pagination } from '../../../../types';
import { AlertAdd } from '../../alert_add';
import { BulkActionPopover } from './bulk_action_popover';
import { CollapsedItemActions } from './collapsed_item_actions';
import { TypeFilter } from './type_filter';
import { ActionTypeFilter } from './action_type_filter';
import { loadAlerts, loadAlertTypes } from '../../../lib/alert_api';
import { loadActionTypes } from '../../../lib/action_connector_api';

export const AlertsList: React.FunctionComponent = () => {
  const {
    core: { http },
    plugins: { capabilities, toastNotifications },
  } = useAppDependencies();
  const canDelete = capabilities.get().alerting.delete;
  const canSave = capabilities.get().alerting.save;

  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [alertTypesIndex, setAlertTypesIndex] = useState<AlertTypeIndex | undefined>(undefined);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [data, setData] = useState<AlertTableItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoadingAlertTypes, setIsLoadingAlertTypes] = useState<boolean>(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);
  const [totalItemCount, setTotalItemCount] = useState<number>(0);
  const [page, setPage] = useState<Pagination>({ index: 0, size: 10 });
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [typesFilter, setTypesFilter] = useState<string[]>([]);
  const [actionTypesFilter, setActionTypesFilter] = useState<string[]>([]);
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);

  useEffect(() => {
    loadAlertsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchText, typesFilter, actionTypesFilter]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingAlertTypes(true);
        const alertTypes = await loadAlertTypes({ http });
        const index: AlertTypeIndex = {};
        for (const alertType of alertTypes) {
          index[alertType.id] = alertType;
        }
        setAlertTypesIndex(index);
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsList.unableToLoadAlertTypesMessage',
            { defaultMessage: 'Unable to load alert types' }
          ),
        });
      } finally {
        setIsLoadingAlertTypes(false);
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

  useEffect(() => {
    // Avoid flickering before alert types load
    if (typeof alertTypesIndex === 'undefined') {
      return;
    }
    const updatedData = alerts.map(alert => ({
      ...alert,
      tagsText: alert.tags.join(', '),
      alertType: alertTypesIndex[alert.alertTypeId]
        ? alertTypesIndex[alert.alertTypeId].name
        : alert.alertTypeId,
    }));
    setData(updatedData);
  }, [alerts, alertTypesIndex]);

  async function loadAlertsData() {
    setIsLoadingAlerts(true);
    try {
      const alertsResponse = await loadAlerts({
        http,
        page,
        searchText,
        typesFilter,
        actionTypesFilter,
      });
      setAlerts(alertsResponse.data);
      setTotalItemCount(alertsResponse.total);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.unableToLoadAlertsMessage',
          {
            defaultMessage: 'Unable to load alerts',
          }
        ),
      });
    } finally {
      setIsLoadingAlerts(false);
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
      field: 'interval',
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
      options={Object.values(alertTypesIndex || {})
        .map(alertType => ({
          value: alertType.id,
          name: alertType.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))}
    />,
    <ActionTypeFilter
      actionTypes={actionTypes}
      onChange={(ids: string[]) => setActionTypesFilter(ids)}
    />,
  ];

  if (canSave) {
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
        <AlertsContext.Provider value={{ alertFlyoutVisible, setAlertFlyoutVisibility }}>
          <EuiSearchBar
            onChange={({ queryText }: { queryText: string }) => setSearchText(queryText)}
            toolsLeft={
              selectedIds.length === 0 || !canDelete
                ? []
                : [
                    <BulkActionPopover
                      selectedItems={pickFromData(data, selectedIds)}
                      onPerformingAction={() => setIsPerformingAction(true)}
                      onActionPerformed={() => {
                        loadAlertsData();
                        setIsPerformingAction(false);
                      }}
                    />,
                  ]
            }
            toolsRight={toolsRight}
          />

          {/* Large to remain consistent with ActionsList table spacing */}
          <EuiSpacer size="l" />

          <EuiBasicTable
            loading={isLoadingAlerts || isLoadingAlertTypes || isPerformingAction}
            items={data}
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
              totalItemCount,
            }}
            selection={
              canDelete
                ? {
                    onSelectionChange(updatedSelectedItemsList: AlertTableItem[]) {
                      setSelectedIds(updatedSelectedItemsList.map(item => item.id));
                    },
                  }
                : null
            }
            onChange={({ page: changedPage }: { page: Pagination }) => {
              setPage(changedPage);
            }}
          />
          <AlertAdd refreshList={loadAlertsData} />
        </AlertsContext.Provider>
      </Fragment>
    </section>
  );
};

function pickFromData(data: AlertTableItem[], ids: string[]): AlertTableItem[] {
  const result: AlertTableItem[] = [];
  for (const id of ids) {
    const match = data.find(item => item.id === id);
    if (match) {
      result.push(match);
    }
  }
  return result;
}
