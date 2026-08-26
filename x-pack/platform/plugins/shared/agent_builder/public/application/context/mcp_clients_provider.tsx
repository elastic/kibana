/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  McpClientDetails,
  type McpClientDetailsData,
  type McpClientDetailsPresentation,
} from '@kbn/agent-builder-browser';
import { appPaths } from '../utils/app_paths';
import { useNavigation } from '../hooks/use_navigation';
import { DeleteMcpClientModal } from '../components/mcp_clients/delete_mcp_client_modal';
import { RevokeMcpClientModal } from '../components/mcp_clients/revoke_mcp_client_modal';

export interface McpClientsActionsContextType {
  createMcpClient: () => void;
  editMcpClient: (clientId: string) => void;
  revokeMcpClient: (clientId: string, clientName: string, connectionCount: number) => void;
  deleteMcpClient: (clientId: string, clientName: string) => void;
  viewClientDetails: (
    clientDetails: McpClientDetailsData,
    presentation: McpClientDetailsPresentation
  ) => void;
}

const McpClientsActionsContext = createContext<McpClientsActionsContextType | undefined>(undefined);

interface RevokeState {
  clientId: string;
  clientName: string;
  connectionCount: number;
}

interface DeleteState {
  clientId: string;
  clientName: string;
}

interface ViewDetailsState {
  clientDetails: McpClientDetailsData;
  presentation: McpClientDetailsPresentation;
}

export const McpClientsProvider = ({ children }: { children: React.ReactNode }) => {
  const { navigateToAgentBuilderUrl } = useNavigation();

  const [revokeState, setRevokeState] = useState<RevokeState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [viewDetailsState, setViewDetailsState] = useState<ViewDetailsState | null>(null);

  const createMcpClient = useCallback(() => {
    navigateToAgentBuilderUrl(appPaths.manage.mcpClientCreate);
  }, [navigateToAgentBuilderUrl]);

  const editMcpClient = useCallback(
    (clientId: string) => {
      navigateToAgentBuilderUrl(appPaths.manage.mcpClientEdit({ clientId }));
    },
    [navigateToAgentBuilderUrl]
  );

  const revokeMcpClient = useCallback(
    (clientId: string, clientName: string, connectionCount: number) => {
      setRevokeState({ clientId, clientName, connectionCount });
    },
    []
  );

  const deleteMcpClient = useCallback((clientId: string, clientName: string) => {
    setDeleteState({ clientId, clientName });
  }, []);

  const viewClientDetails = useCallback(
    (clientDetails: McpClientDetailsData, presentation: McpClientDetailsPresentation) => {
      setViewDetailsState({ clientDetails, presentation });
    },
    []
  );

  const closeRevokeModal = useCallback(() => {
    setRevokeState(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteState(null);
  }, []);

  const closeViewDetails = useCallback(() => {
    setViewDetailsState(null);
  }, []);

  return (
    <McpClientsActionsContext.Provider
      value={{
        createMcpClient,
        editMcpClient,
        revokeMcpClient,
        deleteMcpClient,
        viewClientDetails,
      }}
    >
      {children}
      {revokeState && (
        <RevokeMcpClientModal
          clientId={revokeState.clientId}
          clientName={revokeState.clientName}
          connectionCount={revokeState.connectionCount}
          onClose={closeRevokeModal}
        />
      )}
      {deleteState && (
        <DeleteMcpClientModal
          clientId={deleteState.clientId}
          clientName={deleteState.clientName}
          onClose={closeDeleteModal}
        />
      )}
      {viewDetailsState && (
        <McpClientDetails
          clientDetails={viewDetailsState.clientDetails}
          presentation={viewDetailsState.presentation}
          onClose={closeViewDetails}
        />
      )}
    </McpClientsActionsContext.Provider>
  );
};

export const useMcpClientsActions = () => {
  const context = useContext(McpClientsActionsContext);
  if (!context) {
    throw new Error('useMcpClientsActions must be used within a McpClientsProvider');
  }
  return context;
};
