/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { McpClientDetails } from '@kbn/agent-builder-browser';

import { ApplicationConnectionsActionModal } from '../application_connections_action_modal';
import type {
  ApplicationConnectionsActionMode,
  ApplicationConnectionsModalConnection,
  ApplicationConnectionTarget,
} from '../constants/types';
import type { OAuthClient } from '../service/application_connections_api_client';

export interface ApplicationConnectionsActionOptions {
  onSettled?: (affectedConnections: ApplicationConnectionTarget[]) => void;
}

export interface ApplicationConnectionsActionsContextType {
  revokeConnections: (
    connections: ApplicationConnectionsModalConnection[],
    options?: ApplicationConnectionsActionOptions
  ) => void;
  deleteConnections: (
    connections: ApplicationConnectionsModalConnection[],
    options?: ApplicationConnectionsActionOptions
  ) => void;
  viewClientDetails: (client: OAuthClient) => void;
}

const ApplicationConnectionsActionsContext = createContext<
  ApplicationConnectionsActionsContextType | undefined
>(undefined);

interface ActionState {
  mode: ApplicationConnectionsActionMode;
  connections: ApplicationConnectionsModalConnection[];
}

interface ClientDetailsState {
  client: OAuthClient;
}

export const ApplicationConnectionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [clientDetailsState, setClientDetailsState] = useState<ClientDetailsState | null>(null);
  const onSettledRef = useRef<ApplicationConnectionsActionOptions['onSettled'] | undefined>(
    undefined
  );

  const startAction = useCallback(
    (
      mode: ApplicationConnectionsActionMode,
      connections: ApplicationConnectionsModalConnection[],
      options?: ApplicationConnectionsActionOptions
    ) => {
      onSettledRef.current = options?.onSettled;
      setActionState({ mode, connections });
    },
    []
  );

  const revokeConnections = useCallback(
    (
      connections: ApplicationConnectionsModalConnection[],
      options?: ApplicationConnectionsActionOptions
    ) => startAction('revoke', connections, options),
    [startAction]
  );

  const deleteConnections = useCallback(
    (
      connections: ApplicationConnectionsModalConnection[],
      options?: ApplicationConnectionsActionOptions
    ) => startAction('delete', connections, options),
    [startAction]
  );

  const viewClientDetails = useCallback((client: OAuthClient) => {
    setClientDetailsState({ client });
  }, []);

  const closeActionModal = useCallback(() => {
    onSettledRef.current = undefined;
    setActionState(null);
  }, []);

  const closeClientDetails = useCallback(() => {
    setClientDetailsState(null);
  }, []);

  const handleSettled = useCallback((affected: ApplicationConnectionTarget[]) => {
    onSettledRef.current?.(affected);
  }, []);

  const actions = useMemo<ApplicationConnectionsActionsContextType>(
    () => ({ revokeConnections, deleteConnections, viewClientDetails }),
    [revokeConnections, deleteConnections, viewClientDetails]
  );

  return (
    <ApplicationConnectionsActionsContext.Provider value={actions}>
      {children}
      {actionState && (
        <ApplicationConnectionsActionModal
          mode={actionState.mode}
          connections={actionState.connections}
          onClose={closeActionModal}
          onSettled={handleSettled}
        />
      )}
      {clientDetailsState && (
        <McpClientDetails
          clientDetails={clientDetailsState.client}
          presentation="flyout"
          onClose={closeClientDetails}
        />
      )}
    </ApplicationConnectionsActionsContext.Provider>
  );
};

export const useApplicationConnectionsActions = () => {
  const context = useContext(ApplicationConnectionsActionsContext);
  if (!context) {
    throw new Error(
      'useApplicationConnectionsActions must be used within an ApplicationConnectionsProvider'
    );
  }
  return context;
};
