/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { AgentBuilderConnectorFeatureId } from '@kbn/actions-plugin/common';
import { useQueryClient } from '@kbn/react-query';
import type { ConnectorItem } from '../../../common/http_api/tools';
import { useKibana } from '../hooks/use_kibana';
import { useFlyoutState } from '../hooks/use_flyout_state';
import { queryKeys } from '../query_keys';
import { labels } from '../utils/i18n';
import {
  useDeleteConnector,
  useBulkDeleteConnectors,
} from '../hooks/connectors/use_delete_connectors';

const toActionConnector = (c: ConnectorItem): ActionConnector =>
  ({
    id: c.id,
    name: c.name,
    actionTypeId: c.actionTypeId,
    isPreconfigured: c.isPreconfigured,
    isDeprecated: c.isDeprecated,
    isSystemAction: c.isSystemAction,
    isConnectorTypeDeprecated: c.isConnectorTypeDeprecated,
    config: c.config,
    isMissingSecrets: c.isMissingSecrets ?? false,
    authMode: c.authMode,
    secrets: {},
  } as ActionConnector);

export interface ConnectorsActionsContextType {
  openCreateFlyout: () => void;
  editConnector: (connector: ConnectorItem) => void;
  deleteConnector: (connector: ConnectorItem) => void;
  bulkDeleteConnectors: (connectors: ConnectorItem[]) => void;
  invalidateConnectors: () => void;
}

const ConnectorsActionsContext = createContext<ConnectorsActionsContextType | undefined>(undefined);

export const ConnectorsProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  // Flyout state
  const createFlyoutState = useFlyoutState();
  const [editingConnector, setEditingConnector] = useState<ActionConnector | null>(null);

  // Delete hooks
  const {
    isOpen: isDeleteModalOpen,
    isLoading: isDeletingConnector,
    connector: deleteConnectorTarget,
    deleteConnector,
    confirmDelete,
    cancelDelete,
  } = useDeleteConnector();

  const {
    isOpen: isBulkDeleteModalOpen,
    isLoading: isBulkDeletingConnectors,
    connectors: bulkDeleteConnectorTargets,
    bulkDeleteConnectors,
    confirmDelete: confirmBulkDeleteConnectors,
    cancelDelete: cancelBulkDeleteConnectors,
  } = useBulkDeleteConnectors();

  const invalidateConnectors = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.connectors.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tools.connectors.list() });
  }, [queryClient]);

  // Create flyout
  const handleConnectorCreated = useCallback(() => {
    invalidateConnectors();
    createFlyoutState.closeFlyout();
  }, [invalidateConnectors, createFlyoutState]);

  const createFlyout = useMemo(
    () =>
      triggersActionsUi.getAddConnectorFlyout({
        onClose: createFlyoutState.closeFlyout,
        onConnectorCreated: handleConnectorCreated,
        featureId: AgentBuilderConnectorFeatureId,
      }),
    [createFlyoutState.closeFlyout, handleConnectorCreated, triggersActionsUi]
  );

  // Edit flyout
  const handleConnectorUpdated = useCallback(() => {
    invalidateConnectors();
    setEditingConnector(null);
  }, [invalidateConnectors]);

  const handleEditClose = useCallback(() => setEditingConnector(null), []);

  const editFlyout = useMemo(() => {
    if (!editingConnector) return null;
    return triggersActionsUi.getEditConnectorFlyout({
      connector: editingConnector,
      onClose: handleEditClose,
      onConnectorUpdated: handleConnectorUpdated,
    });
  }, [editingConnector, handleEditClose, handleConnectorUpdated, triggersActionsUi]);

  const editConnector = useCallback((connector: ConnectorItem) => {
    setEditingConnector(toActionConnector(connector));
  }, []);

  const deleteConnectorTitleId = useGeneratedHtmlId({ prefix: 'deleteConnectorTitle' });
  const bulkDeleteConnectorsTitleId = useGeneratedHtmlId({ prefix: 'bulkDeleteConnectorsTitle' });

  return (
    <ConnectorsActionsContext.Provider
      value={{
        openCreateFlyout: createFlyoutState.openFlyout,
        editConnector,
        deleteConnector,
        bulkDeleteConnectors,
        invalidateConnectors,
      }}
    >
      {children}

      {createFlyoutState.isOpen && createFlyout}
      {editFlyout}

      {isDeleteModalOpen && deleteConnectorTarget && (
        <EuiConfirmModal
          title={labels.connectors.deleteConnectorTitle(deleteConnectorTarget.name)}
          aria-labelledby={deleteConnectorTitleId}
          titleProps={{ id: deleteConnectorTitleId }}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
          isLoading={isDeletingConnector}
          cancelButtonText={labels.connectors.deleteConnectorCancelButton}
          confirmButtonText={labels.connectors.deleteConnectorConfirmButton}
          buttonColor="danger"
        >
          <EuiText>{labels.connectors.deleteConnectorConfirmationText}</EuiText>
        </EuiConfirmModal>
      )}

      {isBulkDeleteModalOpen && (
        <EuiConfirmModal
          title={labels.connectors.bulkDeleteConnectorsTitle(bulkDeleteConnectorTargets.length)}
          aria-labelledby={bulkDeleteConnectorsTitleId}
          titleProps={{ id: bulkDeleteConnectorsTitleId }}
          onCancel={cancelBulkDeleteConnectors}
          onConfirm={confirmBulkDeleteConnectors}
          isLoading={isBulkDeletingConnectors}
          cancelButtonText={labels.connectors.deleteConnectorCancelButton}
          confirmButtonText={labels.connectors.bulkDeleteConnectorsConfirmButton(
            bulkDeleteConnectorTargets.length
          )}
          buttonColor="danger"
        >
          <EuiText>{labels.connectors.bulkDeleteConnectorsConfirmationText}</EuiText>
        </EuiConfirmModal>
      )}
    </ConnectorsActionsContext.Provider>
  );
};

export const useConnectorsActions = () => {
  const context = useContext(ConnectorsActionsContext);
  if (!context) {
    throw new Error('useConnectorsActions must be used within a ConnectorsProvider');
  }
  return context;
};
