/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment, useEffect, useState } from 'react';
// @ts-ignore: EuiSearchBar not exported in TypeScript
import { EuiBasicTable, EuiButton, EuiSearchBar, EuiSpacer } from '@elastic/eui';
import { AlertsContext } from '../../../context/alerts_context';
import { useAppDependencies } from '../../../index';
import { Alert, AlertTableItem, AlertTypeIndex, Pagination } from '../../../../types';
import { deleteAlerts, loadAlerts, loadAlertTypes } from '../../../lib/api';
import { AlertAdd } from '../../alert_add';

export const AlertsList: React.FunctionComponent = () => {
  const {
    core: { http },
    plugins: { capabilities, toastNotifications },
  } = useAppDependencies();
  const canDelete = capabilities.get().alerting.delete;

  const [alertTypesIndex, setAlertTypesIndex] = useState<AlertTypeIndex | undefined>(undefined);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [data, setData] = useState<AlertTableItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<AlertTableItem[]>([]);
  const [isLoadingAlertTypes, setIsLoadingAlertTypes] = useState<boolean>(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);
  const [isDeletingActions, setIsDeletingActions] = useState<boolean>(false);
  const [totalItemCount, setTotalItemCount] = useState<number>(0);
  const [page, setPage] = useState<Pagination>({ index: 0, size: 10 });
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);

  useEffect(() => {
    loadAlertsData();
  }, [page, searchText]);

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
            'xpack.alertingUI.sections.alertsList.unableToLoadAlertTypesMessage',
            { defaultMessage: 'Unable to load alert types' }
          ),
        });
      } finally {
        setIsLoadingAlertTypes(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Avoid flickering before alert types load
    if (typeof alertTypesIndex === 'undefined') {
      return;
    }
    const updatedData = alerts.map(alert => ({
      ...alert,
      alertType: alertTypesIndex[alert.alertTypeId]
        ? alertTypesIndex[alert.alertTypeId].name
        : alert.alertTypeId,
    }));
    setData(updatedData);
  }, [alerts, alertTypesIndex]);

  async function loadAlertsData() {
    setIsLoadingAlerts(true);
    try {
      const alertsResponse = await loadAlerts({ http, page, searchText });
      setAlerts(alertsResponse.data);
      setTotalItemCount(alertsResponse.total);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.alertingUI.sections.alertsList.unableToLoadAlertsMessage', {
          defaultMessage: 'Unable to load alerts',
        }),
      });
    } finally {
      setIsLoadingAlerts(false);
    }
  }

  async function deleteItems(items: AlertTableItem[]) {
    setIsDeletingActions(true);
    const ids = items.map(item => item.id);
    try {
      await deleteAlerts({ http, ids });
      await loadAlertsData();
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.alertingUI.sections.alertsList.failedToDeleteAlertsMessage', {
          defaultMessage: 'Failed to delete alert(s)',
        }),
      });
      // Refresh the alerts from the server, some alerts may have been deleted
      await loadAlertsData();
    } finally {
      setIsDeletingActions(false);
    }
  }

  async function deleteSelectedItems() {
    await deleteItems(selectedItems);
  }

  const alertsTableColumns = [
    {
      field: 'alertType',
      name: i18n.translate(
        'xpack.alertingUI.sections.alertsList.alertsListTable.columns.alertType',
        { defaultMessage: 'Type' }
      ),
      sortable: false,
      truncateText: true,
    },
    {
      field: 'interval',
      name: i18n.translate(
        'xpack.alertingUI.sections.alertsList.alertsListTable.columns.interval',
        { defaultMessage: 'Runs every' }
      ),
      sortable: false,
      truncateText: false,
    },
    {
      name: i18n.translate('xpack.alertingUI.sections.alertsList.alertsListTable.columns.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          enabled: () => canDelete,
          name: i18n.translate(
            'xpack.alertingUI.sections.alertsList.alertsListTable.columns.actions.deleteAlertName',
            { defaultMessage: 'Delete' }
          ),
          description: canDelete
            ? i18n.translate(
                'xpack.alertingUI.sections.alertsList.alertsListTable.columns.actions.deleteAlertDescription',
                { defaultMessage: 'Delete this alert' }
              )
            : i18n.translate(
                'xpack.alertingUI.sections.alertsList.alertsListTable.columns.actions.deleteAlertDisabledDescription',
                { defaultMessage: 'Unable to delete alerts' }
              ),
          type: 'icon',
          icon: 'trash',
          onClick: (item: AlertTableItem) => deleteItems([item]),
        },
      ],
    },
  ];

  return (
    <section data-test-subj="alertsList">
      <Fragment>
        <EuiSpacer size="m" />
        <AlertsContext.Provider value={{ alertFlyoutVisible, setAlertFlyoutVisibility }}>
          <EuiSearchBar
            onChange={({ queryText }: { queryText: string }) => setSearchText(queryText)}
            filters={[
              {
                type: 'field_value_selection',
                field: 'type',
                name: i18n.translate(
                  'xpack.alertingUI.sections.alertsList.filters.alertTypeIdName',
                  { defaultMessage: 'Type' }
                ),
                multiSelect: 'or',
                options: Object.values(alertTypesIndex || {})
                  .map(alertType => ({
                    value: alertType.id,
                    name: alertType.name,
                  }))
                  .sort((a, b) => a.name.localeCompare(b.name)),
              },
            ]}
            toolsRight={[
              <EuiButton
                key="delete"
                iconType="trash"
                color="danger"
                isDisabled={selectedItems.length === 0 || !canDelete}
                onClick={deleteSelectedItems}
                title={
                  canDelete
                    ? undefined
                    : i18n.translate(
                        'xpack.alertingUI.sections.alertsList.buttons.deleteDisabledTitle',
                        { defaultMessage: 'Unable to delete alerts' }
                      )
                }
              >
                <FormattedMessage
                  id="xpack.alertingUI.sections.alertsList.buttons.deleteLabel"
                  defaultMessage="Delete"
                />
              </EuiButton>,
              <EuiButton
                key="create-alert"
                data-test-subj="createAlertButton"
                fill
                iconType="plusInCircleFilled"
                iconSide="left"
                onClick={() => setAlertFlyoutVisibility(true)}
              >
                <FormattedMessage
                  id="xpack.alertingUI.sections.alertsList.addActionButtonLabel"
                  defaultMessage="Create"
                />
              </EuiButton>,
            ]}
          ></EuiSearchBar>

          {/* Large to remain consistent with ActionsList table spacing */}
          <EuiSpacer size="l" />

          <EuiBasicTable
            loading={isLoadingAlerts || isLoadingAlertTypes || isDeletingActions}
            items={data}
            itemId="id"
            columns={alertsTableColumns}
            rowProps={() => ({
              'data-test-subj': 'row',
            })}
            cellProps={() => ({
              'data-test-subj': 'cell',
            })}
            data-test-subj="alertsTable"
            pagination={{
              pageIndex: page.index,
              pageSize: page.size,
              totalItemCount,
            }}
            selection={{
              onSelectionChange(updatedSelectedItemsList: AlertTableItem[]) {
                setSelectedItems(updatedSelectedItemsList);
              },
            }}
            onChange={({ page: changedPage }: { page: Pagination }) => {
              setPage(changedPage);
            }}
          ></EuiBasicTable>
          <AlertAdd refreshList={loadAlertsData}></AlertAdd>
        </AlertsContext.Provider>
      </Fragment>
    </section>
  );
};
