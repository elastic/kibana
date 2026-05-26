/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { McpClientDetails } from '@kbn/agent-builder-browser';

import type {
  RevokeApplicationConnectionsModalConnection,
  RevokedApplicationConnection,
} from '../constants/types';
import { RevokeApplicationConnectionsModal } from '../revoke_application_connections_modal';
import type { OAuthClient } from '../service/application_connections_api_client';

export interface RevokeApplicationConnectionsOptions {
  onRevoked?: (revokedConnections: RevokedApplicationConnection[]) => void;
}

export interface ApplicationConnectionsActionsContextType {
  revokeConnections: (
    connections: RevokeApplicationConnectionsModalConnection[],
    options?: RevokeApplicationConnectionsOptions
  ) => void;
  viewClientDetails: (client: OAuthClient) => void;
}

const ApplicationConnectionsActionsContext = createContext<
  ApplicationConnectionsActionsContextType | undefined
>(undefined);

interface RevokeState {
  connections: RevokeApplicationConnectionsModalConnection[];
}

interface ClientDetailsState {
  client: OAuthClient;
}

export const ApplicationConnectionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [revokeState, setRevokeState] = useState<RevokeState | null>(null);
  const [clientDetailsState, setClientDetailsState] = useState<ClientDetailsState | null>(null);
  const onRevokedRef = useRef<RevokeApplicationConnectionsOptions['onRevoked'] | undefined>(
    undefined
  );

  const revokeConnections = useCallback(
    (
      connections: RevokeApplicationConnectionsModalConnection[],
      options?: RevokeApplicationConnectionsOptions
    ) => {
      onRevokedRef.current = options?.onRevoked;
      setRevokeState({ connections });
    },
    []
  );

  const viewClientDetails = useCallback((client: OAuthClient) => {
    setClientDetailsState({ client });
  }, []);

  const closeRevokeModal = useCallback(() => {
    onRevokedRef.current = undefined;
    setRevokeState(null);
  }, []);

  const closeClientDetails = useCallback(() => {
    setClientDetailsState(null);
  }, []);

  const handleRevoked = useCallback((revoked: RevokedApplicationConnection[]) => {
    onRevokedRef.current?.(revoked);
  }, []);

  const actions = useMemo<ApplicationConnectionsActionsContextType>(
    () => ({ revokeConnections, viewClientDetails }),
    [revokeConnections, viewClientDetails]
  );

  return (
    <ApplicationConnectionsActionsContext.Provider value={actions}>
      {children}
      {revokeState && (
        <RevokeApplicationConnectionsModal
          connections={revokeState.connections}
          onClose={closeRevokeModal}
          onRevoked={handleRevoked}
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
