/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiInMemoryTable, EuiPanel, EuiSkeletonText } from '@elastic/eui';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { ActionType } from '@kbn/triggers-actions-ui-plugin/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';

import { UseQueryResult } from '@tanstack/react-query';
import { useAssistantContext } from '../../assistant_context';
import { AIConnector } from '../connector_selector';

import {
  DELETE_CONNECTOR_CONFIRMATION_MULTIPLE_TITLE,
  DELETE_CONNECTOR_CONFIRMATION_SINGLE_TITLE,
  MISSING_READ_CONNECTORS_CALLOUT_TITLE,
} from '../translations';

import { useLoadActionTypes } from '../use_load_action_types';
import { AddConnectorModal } from '../add_connector_modal';
import { ActionConnectorTableItem } from './types';
import { deleteActions } from '../helpers';
import { useConnectorTable } from './use_connector_table';

interface Props {
  connectors: AIConnector[] | undefined;
  refetchConnectors: UseQueryResult<AIConnector[], IHttpFetchError>['refetch'];
  areConnectorsFetched: boolean;
}

const emptyConnectors = [] as ActionConnectorTableItem[];

const ConnectorsSettingsComponent: React.FC<Props> = ({
  connectors: aiConnectors,
  refetchConnectors,
  areConnectorsFetched,
}) => {
  const {
    actionTypeRegistry,
    http,
    assistantAvailability,
    getEditConnectorFlyout,
    getDeleteConnectorModalConfirmation,
  } = useAssistantContext();

  const { data: actionTypes } = useLoadActionTypes({ http });

  // Edit Connector
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);

  const handleCloseEditFlyout = useCallback(() => {
    setEditFlyoutVisibility(false);
  }, []);
  const [editedConnectorItem, setEditedConnectorItem] = useState<AIConnector | null>(null);

  // Add Connector

  const [isAddConnectorModalVisible, setIsAddConnectorModalVisible] = useState<boolean>(false);

  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

  const onSaveConnector = useCallback(() => {
    refetchConnectors?.();
  }, [refetchConnectors]);

  const handleAddConnector = useCallback(() => {
    handleCloseEditFlyout();
    setIsAddConnectorModalVisible(true);
  }, [handleCloseEditFlyout]);

  const onEditConnector = useCallback((connector: ActionConnectorTableItem) => {
    setIsAddConnectorModalVisible(false);
    setEditedConnectorItem(connector);
    setEditFlyoutVisibility(true);
  }, []);

  // delete

  const [connectorsToDelete, setConnectorsToDelete] = useState<string[]>([]);

  const onDeleteConnector = useCallback((connector: ActionConnectorTableItem) => {
    const itemIds = [connector.id];
    setConnectorsToDelete(itemIds);
  }, []);

  const DeleteConnectorModalConfirmation = useMemo(
    () =>
      getDeleteConnectorModalConfirmation({
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
      }),
    [connectorsToDelete, getDeleteConnectorModalConfirmation, refetchConnectors]
  );

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

  const { search, columns, aiConnectorTableItems } = useConnectorTable({
    actionTypes,
    actionTypeRegistry,
    aiConnectors,
    areConnectorsFetched,
    hasConnectorsAllPrivilege: assistantAvailability.hasConnectorsAllPrivilege,
    refetchConnectors,
    handleAddConnector,
    onEditConnector,
    onDeleteConnector,
  });

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
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
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
    </EuiPanel>
  ) : (
    <EuiSkeletonText lines={5} />
  );
};

export const ConnectorsSettings = React.memo(ConnectorsSettingsComponent);
