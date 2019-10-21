/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { EuiInMemoryTable, EuiSpacer, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionsContext } from '../../../context/actions_context';
import { useAppDependencies } from '../../../index';
import { AlertingActionsDropdown } from './create_menu_popover';
import {
  Action,
  ActionType,
  deleteActions,
  loadAllActions,
  loadActionTypes,
} from '../../../lib/api';

type ActionTypeIndex = Record<string, ActionType>;
interface Data extends Action {
  actionType: ActionType['name'];
}

export const ActionsList: React.FunctionComponent = () => {
  const {
    core: { http },
    plugins: { capabilities, toastNotifications },
  } = useAppDependencies();
  const canDelete = capabilities.get().actions.delete;

  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  const [actions, setActions] = useState<Action[]>([]);
  const [data, setData] = useState<Data[]>([]);
  const [selectedItems, setSelectedItems] = useState<Data[]>([]);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);
  const [isLoadingActions, setIsLoadingActions] = useState<boolean>(false);
  const [isDeletingActions, setIsDeletingActions] = useState<boolean>(false);

  useEffect(() => {
    loadActions();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingActionTypes(true);
        const actionTypes = await loadActionTypes({ http });
        const index: ActionTypeIndex = {};
        for (const actionType of actionTypes) {
          index[actionType.id] = actionType;
        }
        setActionTypesIndex(index);
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.alertingUI.sections.actionsList.unableToLoadActionTypesMessage',
            { defaultMessage: 'Unable to load action types' }
          ),
        });
      } finally {
        setIsLoadingActionTypes(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Avoid flickering before action types load
    if (typeof actionTypesIndex === 'undefined') {
      return;
    }
    const updatedData = actions.map(action => {
      return {
        ...action,
        actionType: actionTypesIndex[action.actionTypeId]
          ? actionTypesIndex[action.actionTypeId].name
          : action.actionTypeId,
      };
    });
    setData(updatedData);
  }, [actions, actionTypesIndex]);

  async function loadActions() {
    setIsLoadingActions(true);
    try {
      const actionsResponse = await loadAllActions({ http });
      setActions(actionsResponse.data);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.alertingUI.sections.actionsList.unableToLoadActionsMessage', {
          defaultMessage: 'Unable to load actions',
        }),
      });
    } finally {
      setIsLoadingActions(false);
    }
  }

  async function deleteItems(items: Data[]) {
    setIsDeletingActions(true);
    const ids = items.map(item => item.id);
    try {
      await deleteActions({ http, ids });
      const updatedActions = actions.filter(action => !ids.includes(action.id));
      setActions(updatedActions);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.alertingUI.sections.actionsList.failedToDeleteActionsMessage',
          { defaultMessage: 'Failed to delete action(s)' }
        ),
      });
      // Refresh the actions from the server, some actions may have beend eleted
      loadActions();
    } finally {
      setIsDeletingActions(false);
    }
  }

  async function deleteSelectedItems() {
    await deleteItems(selectedItems);
  }

  const actionsTableColumns = [
    {
      field: 'description',
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.columns.description',
        {
          defaultMessage: 'Description',
        }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'actionType',
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.columns.actionType',
        {
          defaultMessage: 'Action Type',
        }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'config',
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.columns.config',
        { defaultMessage: 'Config' }
      ),
      sortable: false,
      truncateText: false,
    },
    {
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.columns.actions',
        { defaultMessage: 'Actions' }
      ),
      actions: [
        {
          enabled: () => canDelete,
          name: i18n.translate(
            'xpack.alertingUI.sections.actionsList.actionsListTable.columns.actions.deleteActionName',
            { defaultMessage: 'Delete' }
          ),
          description: canDelete
            ? i18n.translate(
                'xpack.alertingUI.sections.actionsList.actionsListTable.columns.actions.deleteActionDescription',
                { defaultMessage: 'Delete this action' }
              )
            : i18n.translate(
                'xpack.alertingUI.sections.actionsList.actionsListTable.columns.actions.deleteActionDisabledDescription',
                { defaultMessage: 'Unable to delete actions' }
              ),
          type: 'icon',
          icon: 'trash',
          onClick: (item: Data) => deleteItems([item]),
        },
      ],
    },
  ];

  return (
    <section data-test-subj="actionsList">
      <Fragment>
        <EuiSpacer size="m" />
        <ActionsContext.Provider value={{}}>
          <EuiInMemoryTable
            loading={isLoadingActions || isLoadingActionTypes || isDeletingActions}
            items={data}
            sorting={true}
            itemId="id"
            columns={actionsTableColumns}
            rowProps={() => ({
              'data-test-subj': 'row',
            })}
            cellProps={() => ({
              'data-test-subj': 'cell',
            })}
            data-test-subj="actionsTable"
            pagination={true}
            selection={{
              onSelectionChange(updatedSelectedItemsList: Data[]) {
                setSelectedItems(updatedSelectedItemsList);
              },
            }}
            search={{
              filters: [
                {
                  type: 'field_value_selection',
                  field: 'actionTypeId',
                  name: i18n.translate(
                    'xpack.alertingUI.sections.actionsList.filters.actionTypeIdName',
                    { defaultMessage: 'Action Type' }
                  ),
                  multiSelect: 'or',
                  options: Object.values(actionTypesIndex || {})
                    .map(actionType => ({
                      value: actionType.id,
                      name: actionType.name,
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name)),
                },
              ],
              toolsRight: [
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
                          'xpack.alertingUI.sections.actionsList.buttons.deleteDisabledTitle',
                          { defaultMessage: 'Unable to delete actions' }
                        )
                  }
                >
                  <FormattedMessage
                    id="xpack.alertingUI.sections.actionsList.buttons.deleteLabel"
                    defaultMessage="Delete"
                  />
                </EuiButton>,
                <AlertingActionsDropdown
                  key="create-action"
                  actionTypes={actionTypesIndex}
                ></AlertingActionsDropdown>,
              ],
            }}
          />
        </ActionsContext.Provider>
      </Fragment>
    </section>
  );
};
