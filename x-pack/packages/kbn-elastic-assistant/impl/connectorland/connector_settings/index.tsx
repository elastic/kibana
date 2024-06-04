/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSearchBarProps,
  EuiSkeletonText,
} from '@elastic/eui';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { ActionConnector, ActionType } from '@kbn/triggers-actions-ui-plugin/public';
import { getConnectorCompatibility } from '@kbn/actions-plugin/common';
import { useAssistantContext } from '../../assistant_context';
import { AIConnector } from '../connector_selector';

import { useLoadConnectors } from '../use_load_connectors';
import {
  CONNECTORS_TABLE_COLUMN_ACTIONS,
  CONNECTORS_TABLE_COLUMN_ACTION_TYPE,
  CONNECTORS_TABLE_COLUMN_COMPATIBILITY,
  CONNECTORS_TABLE_COLUMN_NAME,
  CREATE_CONNECTOR_BUTTON,
  DELETE_CONNECTOR_CONFIRMATION_MULTIPLE_TITLE,
  DELETE_CONNECTOR_CONFIRMATION_SINGLE_TITLE,
  MISSING_READ_CONNECTORS_CALLOUT_TITLE,
  REFRESH_CONNECTORS_BUTTON,
} from '../translations';
import { ConnectorRowActions } from './connector_row_actions';
import { useLoadActionTypes } from '../use_load_action_types';
import { AddConnectorModal } from '../add_connector_modal';
import { ActionConnectorTableItem } from './types';
import { deleteActions } from '../helpers';

const emptyConnectors = [] as ActionConnectorTableItem[];

const ConnectorsSettingsComponent: React.FC = () => {
  const {
    actionTypeRegistry,
    http,
    assistantAvailability,
    getEditConnectorFlyout,
    getDeleteConnectorModalConfirmation,
  } = useAssistantContext();

  const {
    data: aiConnectors,
    refetch: refetchConnectors,
    isFetchedAfterMount: areConnectorsFetched,
  } = useLoadConnectors({ http });
  const { data: actionTypes } = useLoadActionTypes({ http });

  const aiConnectorTableItems: ActionConnectorTableItem[] | undefined = areConnectorsFetched
    ? (aiConnectors ?? []).map((action) => {
        const currentActionType = actionTypes?.find(
          (actionType) => actionType.id === action.actionTypeId
        );
        return {
          ...action,
          actionType: currentActionType?.name ?? action.actionTypeId,
          compatibility: currentActionType
            ? getConnectorCompatibility(currentActionType.supportedFeatureIds)
            : [],
        };
      })
    : undefined;

  // Edit Connector
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);

  const handleCloseEditFlyout = useCallback(() => {
    setEditFlyoutVisibility(false);
  }, []);
  const [editedConnectorItem, setEditedConnectorItem] = useState<AIConnector | null>(null);

  // Add Connector

  const [isAddConnectorModalVisible, setIsAddConnectorModalVisible] = useState<boolean>(false);

  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

  const onSaveConnector = useCallback(
    (connector: ActionConnector) => {
      // onConnectorSelectionChange({
      //   ...connector,
      // });
      refetchConnectors?.();
      // setAddModalVisibility(false);
    },
    [refetchConnectors]
  );

  const handleAddConnector = useCallback(() => {
    handleCloseEditFlyout();
    setIsAddConnectorModalVisible(true);
  }, [handleCloseEditFlyout]);

  const onClickEditConnector = useCallback((connector: ActionConnectorTableItem) => {
    setIsAddConnectorModalVisible(false);
    setEditedConnectorItem(connector);
    setEditFlyoutVisibility(true);
  }, []);

  // search
  const [query, setQuery] = useState('');

  const handleOnChange: EuiSearchBarProps['onChange'] = ({ queryText, error }) => {
    if (!error) {
      setQuery(queryText);
    }
  };

  // refetch

  const handleRefetchConnectors = useCallback(() => {
    refetchConnectors();
  }, [refetchConnectors]);

  // delete

  const [connectorsToDelete, setConnectorsToDelete] = useState<string[]>([]);

  const onClickDeleteConnector = useCallback((connector: ActionConnectorTableItem) => {
    const itemIds = [connector.id];
    setConnectorsToDelete(itemIds);
  }, []);

  const DeleteConnectorModalConfirmation = getDeleteConnectorModalConfirmation({
    idsToDelete: connectorsToDelete,
    apiDeleteCall: deleteActions,
    onDeleted: (deleted: string[]) => {
      refetchConnectors();
    },
    onCancel: () => {
      setConnectorsToDelete([]);
    },
    onErrors: () => {
      setConnectorsToDelete([]);
    },
    singleTitle: DELETE_CONNECTOR_CONFIRMATION_SINGLE_TITLE,
    multipleTitle: DELETE_CONNECTOR_CONFIRMATION_MULTIPLE_TITLE,
    setIsLoadingState: () => {},
  });

  const columns = [
    {
      name: CONNECTORS_TABLE_COLUMN_NAME,
      truncateText: false,
      mobileOptions: {
        show: true,
      },
      render: (connector: ActionConnectorTableItem) => (
        <EuiButtonEmpty onClick={() => onClickEditConnector(connector)}>
          {connector.name}
        </EuiButtonEmpty>
      ),
    },
    {
      field: 'actionType',
      name: CONNECTORS_TABLE_COLUMN_ACTION_TYPE,
      truncateText: false,
      mobileOptions: {
        show: true,
      },
      render: (actionType: ActionConnectorTableItem['actionType']) =>
        actionType ? <EuiBadge color="hollow">{actionType}</EuiBadge> : null,
    },
    {
      name: CONNECTORS_TABLE_COLUMN_COMPATIBILITY,
      sortable: false,
      truncateText: true,
      mobileOptions: {
        show: true,
      },
      render: (tableItem: ActionConnectorTableItem) => {
        return (
          <EuiFlexGroup
            wrap
            responsive={false}
            gutterSize="xs"
            data-test-subj="compatibility-content"
          >
            {tableItem?.compatibility?.map((compatibilityItem: string) => (
              <EuiFlexItem grow={false} key={`${tableItem.id}-${compatibilityItem}`}>
                <EuiBadge data-test-subj="connectorsTableCell-compatibility-badge" color="default">
                  {compatibilityItem}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: CONNECTORS_TABLE_COLUMN_ACTIONS,
      actions: [
        {
          name: CONNECTORS_TABLE_COLUMN_ACTIONS,
          icon: 'boxesHorizontal',
          render: (connector: ActionConnectorTableItem) => {
            return (
              <ConnectorRowActions
                connector={connector}
                onClickEditConnector={onClickEditConnector}
                onClickDeleteConnector={onClickDeleteConnector}
              />
            );
          },
        },
      ],
    },
  ];

  const search: EuiSearchBarProps = {
    query,
    onChange: handleOnChange,
    box: {
      schema: true,
      placeholder: 'Search for connectors',
    },
    toolsRight: [
      <EuiButton
        key="refetchConnector"
        iconType="refresh"
        isDisabled={!areConnectorsFetched}
        onClick={handleRefetchConnectors}
      >
        {REFRESH_CONNECTORS_BUTTON}
      </EuiButton>,
      <EuiButton
        key="createConnector"
        iconType="plusInCircle"
        isDisabled={!assistantAvailability.hasConnectorsAllPrivilege && !areConnectorsFetched}
        onClick={handleAddConnector}
      >
        {CREATE_CONNECTOR_BUTTON}
      </EuiButton>,
    ],
  };

  const onConnectorUpdated = useCallback(
    async (updatedConnector) => {
      setEditedConnectorItem(updatedConnector);
      refetchConnectors();
      handleCloseEditFlyout();
    },
    [handleCloseEditFlyout, refetchConnectors]
  );

  const ConnectorEditFlyout = useMemo(
    () =>
      editedConnectorItem && editFlyoutVisible
        ? getEditConnectorFlyout({
            connector: editedConnectorItem,
            onClose: handleCloseEditFlyout,
            onConnectorUpdated,
          })
        : null,
    [
      editFlyoutVisible,
      editedConnectorItem,
      getEditConnectorFlyout,
      handleCloseEditFlyout,
      onConnectorUpdated,
    ]
  );

  if (!assistantAvailability.hasConnectorsReadPrivilege) {
    return (
      <EuiCallOut
        data-test-subj="connectorMissingCallout"
        color="danger"
        iconType="controlsVertical"
        size="m"
        title={MISSING_READ_CONNECTORS_CALLOUT_TITLE}
      />
    );
  }

  return areConnectorsFetched ? (
    <>
      {DeleteConnectorModalConfirmation}
      <EuiInMemoryTable
        items={aiConnectorTableItems ?? emptyConnectors}
        columns={columns}
        pagination={true}
        search={search}
      />
      {ConnectorEditFlyout}
      {isAddConnectorModalVisible && (
        // Crashing management app otherwise
        <Suspense fallback>
          <AddConnectorModal
            actionTypeRegistry={actionTypeRegistry}
            actionTypes={actionTypes}
            onClose={() => setIsAddConnectorModalVisible(false)}
            onSaveConnector={onSaveConnector}
            onSelectActionType={(actionType: ActionType) => setSelectedActionType(actionType)}
            selectedActionType={selectedActionType}
          />
        </Suspense>
      )}
    </>
  ) : (
    <EuiSkeletonText lines={5} />
  );
};

export const ConnectorsSettings = React.memo(ConnectorsSettingsComponent);
