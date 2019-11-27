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
import { ActionConnector, ActionConnectorTableItem, ActionTypeIndex } from '../../../../types';
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
  const [data, setData] = useState<ActionConnectorTableItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<ActionConnectorTableItem[]>([]);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);
  const [isLoadingActions, setIsLoadingActions] = useState<boolean>(false);
  const [isDeletingActions, setIsDeletingActions] = useState<boolean>(false);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const [actionTypesList, setActionTypesList] = useState<Array<{ value: string; name: string }>>(
    []
  );
  const [editedConnectorItem, setEditedConnectorItem] = useState<
    ActionConnectorTableItem | undefined
  >(undefined);

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
            'xpack.triggersActionsUI.sections.actionsConnectorsList.unableToLoadActionTypesMessage',
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
          'xpack.triggersActionsUI.sections.actionsConnectorsList.unableToLoadActionsMessage',
          {
            defaultMessage: 'Unable to load actions',
          }
        ),
      });
    } finally {
      setIsLoadingActions(false);
    }
  }

  async function deleteItems(items: ActionConnectorTableItem[]) {
    setIsDeletingActions(true);
    const ids = items.map(item => (item.id ? item.id : ''));
    try {
      await deleteActions({ http, ids });
      const updatedActions = actions.filter(action => action.id && !ids.includes(action.id));
      setActions(updatedActions);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.actionsConnectorsList.failedToDeleteActionsMessage',
          { defaultMessage: 'Failed to delete action(s)' }
        ),
      });
      // Refresh the actions from the server, some actions may have beend deleted
      loadActions();
    } finally {
      setIsDeletingActions(false);
    }
  }

  async function editItem(connectorTableItem: ActionConnectorTableItem) {
    setEditedConnectorItem(connectorTableItem);
    setEditFlyoutVisibility(true);
  }

  async function deleteSelectedItems() {
    await deleteItems(selectedItems);
  }

  const actionsTableColumns = [
    {
      field: 'actionType',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actionTypeTitle',
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
        'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.descriptionTitle',
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
        'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.referencedByCountTitle',
        { defaultMessage: 'Attached actions' }
      ),
      sortable: false,
      truncateText: true,
      render: (value: number, item: ActionConnectorTableItem) => {
        return <EuiBadge key={item.id}>{value}</EuiBadge>;
      },
    },
    {
      name: '',
      actions: [
        {
          enabled: () => canSave,
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.editActionName',
            { defaultMessage: 'Edit' }
          ),
          description: canSave
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.editActionDescription',
                { defaultMessage: 'Edit this action' }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.editActionDisabledDescription',
                { defaultMessage: 'Unable to edit actions' }
              ),
          type: 'icon',
          icon: 'pencil',
          onClick: (item: ActionConnectorTableItem) => editItem(item),
        },
        {
          enabled: () => canDelete,
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.deleteActionName',
            { defaultMessage: 'Delete' }
          ),
          description: canDelete
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.deleteActionDescription',
                { defaultMessage: 'Delete this action' }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.deleteActionDisabledDescription',
                { defaultMessage: 'Unable to delete actions' }
              ),
          type: 'icon',
          icon: 'trash',
          onClick: (item: ActionConnectorTableItem) => deleteItems([item]),
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
                onSelectionChange(updatedSelectedItemsList: ActionConnectorTableItem[]) {
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
                    'xpack.triggersActionsUI.sections.actionsConnectorsList.filters.actionTypeIdName',
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
                                'xpack.triggersActionsUI.sections.actionsConnectorsList.buttons.deleteDisabledTitle',
                                { defaultMessage: 'Unable to delete actions' }
                              )
                        }
                      >
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.actionsConnectorsList.buttons.deleteLabel"
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
                    id="xpack.triggersActionsUI.sections.actionsConnectorsList.addActionButtonLabel"
                    defaultMessage="Create"
                  />
                </EuiButton>,
              ],
            }}
          />
          <ConnectorAddFlyout />
          {editedConnectorItem ? <ConnectorEditFlyout connector={editedConnectorItem} /> : null}
        </ActionsConnectorsContext.Provider>
      </Fragment>
    </section>
  );
};

function getActionsCountByActionType(actions: ActionConnector[], actionTypeId: string) {
  return actions.filter(action => action.actionTypeId === actionTypeId).length;
}
