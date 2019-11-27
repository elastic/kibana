/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { EuiBadge, EuiInMemoryTable, EuiSpacer, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionsConnectorsContext } from '../../../context/actions_connectors_context';
import { useAppDependencies } from '../../../app_dependencies';
import { deleteActions, loadAllActions, loadActionTypes } from '../../../lib/api';
import { ActionConnector, ActionTableItem, ActionTypeIndex } from '../../../../types';
import { ConnectorAddFlyout, ConnectorEditFlyout } from '../../action_connector_form';

export const ActionsConnectorsList: React.FunctionComponent = () => {
  const {
    core: { http },
    plugins: { capabilities, toastNotifications },
  } = useAppDependencies();
  const canDelete = capabilities.get().actions.delete;
  const canSave = capabilities.get().actions.save;

  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  const [actions, setActions] = useState<ActionConnector[]>([]);
  const [data, setData] = useState<ActionTableItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<ActionTableItem[]>([]);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);
  const [isLoadingActions, setIsLoadingActions] = useState<boolean>(false);
  const [isDeletingActions, setIsDeletingActions] = useState<boolean>(false);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const [actionTypesList, setActionTypesList] = useState<Array<{ value: string; name: string }>>(
    []
  );
  const [editedActionItem, setEditedActionItem] = useState<ActionTableItem | undefined>(undefined);

  useEffect(() => {
    loadActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingActionTypes(true);
        const actionTypes = await loadActionTypes({ http });
        const index: ActionTypeIndex = {};
        for (const actionTypeItem of actionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setActionTypesIndex(index);
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.actionsList.unableToLoadActionTypesMessage',
            { defaultMessage: 'Unable to load action types' }
          ),
        });
      } finally {
        setIsLoadingActionTypes(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Avoid flickering before action types load
    if (typeof actionTypesIndex === 'undefined') {
      return;
    }
    // Update the data for the table
    const updatedData = actions.map(action => {
      return {
        ...action,
        actionType: actionTypesIndex[action.actionTypeId]
          ? actionTypesIndex[action.actionTypeId].name
          : action.actionTypeId,
      };
    });
    setData(updatedData);
    // Update the action types list for the filter
    const actionTypes = Object.values(actionTypesIndex)
      .map(actionType => ({
        value: actionType.id,
        name: `${actionType.name} (${getActionsCountByActionType(actions, actionType.id)})`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setActionTypesList(actionTypes);
  }, [actions, actionTypesIndex]);

  async function loadActions() {
    setIsLoadingActions(true);
    try {
      const actionsResponse = await loadAllActions({ http });
      setActions(actionsResponse.data);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.actionsList.unableToLoadActionsMessage',
          {
            defaultMessage: 'Unable to load actions',
          }
        ),
      });
    } finally {
      setIsLoadingActions(false);
    }
  }

  async function deleteItems(items: ActionTableItem[]) {
    setIsDeletingActions(true);
    const ids = items.map(item => (item.id ? item.id : ''));
    try {
      await deleteActions({ http, ids });
      const updatedActions = actions.filter(action => action.id && !ids.includes(action.id));
      setActions(updatedActions);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.actionsList.failedToDeleteActionsMessage',
          { defaultMessage: 'Failed to delete action(s)' }
        ),
      });
      // Refresh the actions from the server, some actions may have beend deleted
      loadActions();
    } finally {
      setIsDeletingActions(false);
    }
  }

  async function editItem(actionTableItem: ActionTableItem) {
    setEditedActionItem(actionTableItem);
    setEditFlyoutVisibility(true);
  }

  async function deleteSelectedItems() {
    await deleteItems(selectedItems);
  }

  const actionsTableColumns = [
    {
      field: 'actionType',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.actionsList.actionsListTable.columns.actionTypeTitle',
        {
          defaultMessage: 'Type',
        }
      ),
      sortable: false,
      truncateText: true,
    },
    {
      field: 'description',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.actionsList.actionsListTable.columns.descriptionTitle',
        {
          defaultMessage: 'Name',
        }
      ),
      sortable: false,
      truncateText: true,
    },
    {
      field: 'referencedByCount',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.actionsList.actionsListTable.columns.referencedByCountTitle',
        { defaultMessage: 'Attached actions' }
      ),
      sortable: false,
      truncateText: true,
      render: (value: number, item: ActionTableItem) => {
        return <EuiBadge key={item.id}>{value}</EuiBadge>;
      },
    },
    {
      name: '',
      actions: [
        {
          enabled: () => canSave,
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.actionsList.actionsListTable.columns.actions.editActionName',
            { defaultMessage: 'Edit' }
          ),
          description: canSave
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.actionsList.actionsListTable.columns.actions.editActionDescription',
                { defaultMessage: 'Edit this action' }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.actionsList.actionsListTable.columns.actions.editActionDisabledDescription',
                { defaultMessage: 'Unable to edit actions' }
              ),
          type: 'icon',
          icon: 'pencil',
          onClick: (item: ActionTableItem) => editItem(item),
        },
        {
          enabled: () => canDelete,
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.actionsList.actionsListTable.columns.actions.deleteActionName',
            { defaultMessage: 'Delete' }
          ),
          description: canDelete
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.actionsList.actionsListTable.columns.actions.deleteActionDescription',
                { defaultMessage: 'Delete this action' }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.actionsList.actionsListTable.columns.actions.deleteActionDisabledDescription',
                { defaultMessage: 'Unable to delete actions' }
              ),
          type: 'icon',
          icon: 'trash',
          onClick: (item: ActionTableItem) => deleteItems([item]),
        },
      ],
    },
  ];

  return (
    <section data-test-subj="actionsList">
      <Fragment>
        <EuiSpacer size="m" />
        <ActionsConnectorsContext.Provider
          value={{
            addFlyoutVisible,
            setAddFlyoutVisibility,
            editFlyoutVisible,
            setEditFlyoutVisibility,
            actionTypesIndex,
            loadActions,
            editedActionItem,
          }}
        >
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
            selection={
              canDelete && {
                onSelectionChange(updatedSelectedItemsList: ActionTableItem[]) {
                  setSelectedItems(updatedSelectedItemsList);
                },
              }
            }
            search={{
              filters: [
                {
                  type: 'field_value_selection',
                  field: 'actionTypeId',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.actionsList.filters.actionTypeIdName',
                    { defaultMessage: 'Type' }
                  ),
                  multiSelect: 'or',
                  options: actionTypesList,
                },
              ],
              toolsLeft:
                selectedItems.length === 0 || !canDelete
                  ? []
                  : [
                      <EuiButton
                        key="delete"
                        iconType="trash"
                        color="danger"
                        onClick={deleteSelectedItems}
                        title={
                          canDelete
                            ? undefined
                            : i18n.translate(
                                'xpack.triggersActionsUI.sections.actionsList.buttons.deleteDisabledTitle',
                                { defaultMessage: 'Unable to delete actions' }
                              )
                        }
                      >
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.actionsList.buttons.deleteLabel"
                          defaultMessage="Delete ({count})"
                          values={{
                            count: selectedItems.length,
                          }}
                        />
                      </EuiButton>,
                    ],
              toolsRight: [
                <EuiButton
                  data-test-subj="createActionButton"
                  key="create-action"
                  fill
                  iconType="plusInCircle"
                  iconSide="left"
                  onClick={() => setAddFlyoutVisibility(true)}
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionsList.addActionButtonLabel"
                    defaultMessage="Create"
                  />
                </EuiButton>,
              ],
            }}
          />
          <ConnectorAddFlyout />
          <ConnectorEditFlyout />
        </ActionsConnectorsContext.Provider>
      </Fragment>
    </section>
  );
};

function getActionsCountByActionType(actions: ActionConnector[], actionTypeId: string) {
  return actions.filter(action => action.actionTypeId === actionTypeId).length;
}
