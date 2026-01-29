/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { DataSource, StackConnectorConfig, ConnectorRole } from '@kbn/data-catalog-plugin';
import { useKibana } from './use_kibana';
import { API_BASE_PATH } from '../../../common/constants';
import { queryKeys } from '../query_keys';
import { ConnectorPrompt } from '../components/optional_connector_prompt';

/**
 * Get the effective role of a connector.
 * - First connector defaults to 'primary' if no role specified
 * - Other connectors default to 'required' if no role specified
 */
function getEffectiveRole(connectorConfig: StackConnectorConfig, index: number): ConnectorRole {
  if (connectorConfig.role) {
    return connectorConfig.role;
  }
  // First connector is implicitly primary, others are implicitly required
  return index === 0 ? 'primary' : 'required';
}

/**
 * Build processing order: primary connectors first, then required, then optional.
 * Returns array of indices into the original stackConnectors array.
 */
function buildProcessingOrder(connectorsList: StackConnectorConfig[]): number[] {
  const primary: number[] = [];
  const required: number[] = [];
  const optional: number[] = [];

  connectorsList.forEach((sc, idx) => {
    const role = getEffectiveRole(sc, idx);
    if (role === 'primary') {
      primary.push(idx);
    } else if (role === 'required') {
      required.push(idx);
    } else {
      optional.push(idx);
    }
  });

  return [...primary, ...required, ...optional];
}

export interface UseAddConnectorFlyoutOptions {
  onConnectorCreated?: (connector: ActionConnector) => void;
  onComplete?: () => void;
}

interface ConnectorCredential {
  connector_type: string;
  credentials?: string;
  existing_connector_id?: string;
}

interface CreateDataConnectorPayload {
  name: string;
  type: string;
  connector_credentials: ConnectorCredential[];
}

type FlowState =
  | { type: 'idle' }
  | { type: 'flyout'; connectorIndex: number; dataSource: DataSource; suggestedName?: string }
  | {
      type: 'connector_prompt';
      connectorIndex: number;
      dataSource: DataSource;
      suggestedName?: string;
      role: ConnectorRole;
    }
  | { type: 'complete' };

/**
 * Hook to manage connector creation flyouts for data sources.
 * Supports multi-connector data sources by showing sequential flyouts
 * and prompting for optional connectors.
 */
export const useAddConnectorFlyout = ({
  onConnectorCreated,
  onComplete,
}: UseAddConnectorFlyoutOptions = {}) => {
  const {
    services: {
      plugins: { triggersActionsUi },
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const queryClient = useQueryClient();
  const loadingToastRef = useRef<ReturnType<typeof toasts.addInfo> | undefined>();

  // Flow state management
  const [flowState, setFlowState] = useState<FlowState>({ type: 'idle' });
  // Track created connectors - state for UI updates, ref for closure-safe access in callbacks
  const [createdConnectors, setCreatedConnectors] = useState<ActionConnector[]>([]);
  // Ref mirrors state for closure-safe access (callbacks capture stale state values)
  const createdConnectorsRef = useRef<ActionConnector[]>([]);

  // Store active session data separately to survive flyout close events
  const activeSessionRef = useRef<{
    dataSource: DataSource;
    dataSourceType: string;
    suggestedName?: string;
    processingOrder: number[]; // Indices in priority order: primary → required → optional
  } | null>(null);

  // Get stack connectors from session ref (survives flyout close)
  // Memoized to prevent useMemo dependency issues
  const stackConnectors = useMemo(
    () => activeSessionRef.current?.dataSource?.stackConnectors ?? [],
    // Re-compute when flow state changes (which updates activeSessionRef)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flowState]
  );

  // Mutation for creating data source
  const createDataSourceMutation = useMutation({
    mutationFn: async (payload: CreateDataConnectorPayload) => {
      return http.post(`${API_BASE_PATH}`, {
        body: JSON.stringify(payload),
      });
    },
    onMutate: ({ name }) => {
      const loadingToast = toasts.addInfo(
        {
          title: i18n.translate('xpack.dataSources.hooks.useAddConnectorFlyout.creatingTitle', {
            defaultMessage: 'Creating data source',
          }),
          text: i18n.translate('xpack.dataSources.hooks.useAddConnectorFlyout.creatingText', {
            defaultMessage: 'Setting up {connectorName}...',
            values: { connectorName: name },
          }),
        },
        { toastLifeTimeMs: 30000 }
      );
      loadingToastRef.current = loadingToast;
    },
    onSuccess: (_, variables) => {
      if (loadingToastRef.current) {
        toasts.remove(loadingToastRef.current);
        loadingToastRef.current = undefined;
      }

      toasts.addSuccess(
        i18n.translate('xpack.dataSources.hooks.useAddConnectorFlyout.createSuccessText', {
          defaultMessage: 'Data source {connectorName} connected successfully',
          values: { connectorName: variables.name },
        })
      );

      queryClient.invalidateQueries(queryKeys.dataSources.list());
    },
    onError: (error) => {
      if (loadingToastRef.current) {
        toasts.remove(loadingToastRef.current);
        loadingToastRef.current = undefined;
      }

      toasts.addError(error as Error, {
        title: i18n.translate('xpack.dataSources.hooks.useAddConnectorFlyout.createErrorTitle', {
          defaultMessage: 'Failed to create data source',
        }),
      });
    },
  });

  // Find next connector to process using the processing order (primary → required → optional)
  const findNextInOrder = useCallback(
    (
      orderPosition: number,
      processingOrder: number[],
      connectorsList: StackConnectorConfig[],
      created: ActionConnector[]
    ): { orderPosition: number; connectorIndex: number } | null => {
      for (let i = orderPosition; i < processingOrder.length; i++) {
        const connectorIndex = processingOrder[i];
        // Check if we already have a connector for this type
        const alreadyCreated = created.some(
          (c) => c.actionTypeId === connectorsList[connectorIndex].type
        );
        if (!alreadyCreated) {
          return { orderPosition: i, connectorIndex };
        }
      }
      return null;
    },
    []
  );

  // Process next connector or complete the flow
  const processNextConnector = useCallback(
    (
      orderPosition: number,
      connectors: ActionConnector[],
      ds: DataSource,
      dsType: string,
      processingOrder: number[],
      name?: string
    ) => {
      const connectorsList = ds.stackConnectors ?? [];
      const next = findNextInOrder(orderPosition, processingOrder, connectorsList, connectors);

      if (next === null) {
        // No more connectors - create data source
        setFlowState({ type: 'complete' });
        activeSessionRef.current = null;
        createdConnectorsRef.current = [];
        setCreatedConnectors([]);

        if (dsType && connectors.length > 0) {
          const connectorCredentials: ConnectorCredential[] = connectors.map((c) => ({
            connector_type: c.actionTypeId,
            existing_connector_id: c.id,
          }));

          // Data source name comes from the primary connector
          const primaryConfig = connectorsList.find(
            (sc, idx) => getEffectiveRole(sc, idx) === 'primary'
          );
          const primaryConnector = primaryConfig
            ? connectors.find((c) => c.actionTypeId === primaryConfig.type)
            : null;

          createDataSourceMutation.mutate({
            name: name || primaryConnector?.name || connectors[0].name,
            type: dsType,
            connector_credentials: connectorCredentials,
          });
        }

        onComplete?.();
        return;
      }

      const { connectorIndex } = next;
      const connectorConfig = connectorsList[connectorIndex];
      const role = getEffectiveRole(connectorConfig, connectorIndex);

      if (role === 'primary') {
        // Show flyout directly for primary connector
        setFlowState({
          type: 'flyout',
          connectorIndex,
          dataSource: ds,
          suggestedName: name,
        });
      } else {
        // Show prompt for required and optional connectors (after primary)
        // - Required: prompt with "Continue" button (no skip)
        // - Optional: prompt with "Set up" and "Skip" buttons
        setFlowState({
          type: 'connector_prompt',
          connectorIndex,
          dataSource: ds,
          suggestedName: name,
          role,
        });
      }
    },
    [findNextInOrder, createDataSourceMutation, onComplete]
  );

  // Start the flow - accepts dataSource directly to avoid closure issues
  const openFlyout = useCallback(
    (ds?: DataSource, dsType?: string, name?: string) => {
      // Reset both state and ref
      createdConnectorsRef.current = [];
      setCreatedConnectors([]);

      if (!ds || !dsType || (ds.stackConnectors?.length ?? 0) === 0) {
        // No data source definition - can't proceed
        toasts.addError(new Error('No data source definition provided'), {
          title: 'Cannot create data source',
        });
        return;
      }

      // Build processing order: primary → required → optional
      const processingOrder = buildProcessingOrder(ds.stackConnectors ?? []);

      // Store session data in ref (survives flyout close events)
      activeSessionRef.current = {
        dataSource: ds,
        dataSourceType: dsType,
        suggestedName: name,
        processingOrder,
      };

      // Start processing from first position in order
      processNextConnector(0, [], ds, dsType, processingOrder, name);
    },
    [processNextConnector, toasts]
  );

  // Close and reset - only resets if no connectors were created
  // (the flyout calls onClose even after successful creation)
  const closeFlyout = useCallback(() => {
    // Don't reset if we have created connectors - let handleConnectorCreated manage flow
    // Use ref for closure-safe check
    if (createdConnectorsRef.current.length === 0) {
      setFlowState({ type: 'idle' });
      activeSessionRef.current = null;
    }
  }, []);

  // Handle connector created from flyout
  const handleConnectorCreated = useCallback(
    (connector: ActionConnector) => {
      onConnectorCreated?.(connector);

      // Update both state and ref
      const updatedConnectors = [...createdConnectorsRef.current, connector];
      createdConnectorsRef.current = updatedConnectors;
      setCreatedConnectors(updatedConnectors);

      // Process next connector - get dataSource from session ref (survives flyout close)
      const session = activeSessionRef.current;
      if (session) {
        // Start from position 0 - findNextInOrder will skip already-created connectors
        processNextConnector(
          0,
          updatedConnectors,
          session.dataSource,
          session.dataSourceType,
          session.processingOrder,
          session.suggestedName
        );
      }
    },
    [onConnectorCreated, processNextConnector]
  );

  // Handle connector prompt - user wants to set up / continue
  const handlePromptSetUp = useCallback(() => {
    if (flowState.type === 'connector_prompt') {
      setFlowState({
        type: 'flyout',
        connectorIndex: flowState.connectorIndex,
        dataSource: flowState.dataSource,
        suggestedName: flowState.suggestedName,
      });
    }
  }, [flowState]);

  // Handle connector prompt - user wants to skip (only for optional connectors)
  const handlePromptSkip = useCallback(() => {
    const session = activeSessionRef.current;
    if (flowState.type === 'connector_prompt' && session) {
      // Find current position in processing order and advance past it
      const currentOrderPos = session.processingOrder.indexOf(flowState.connectorIndex);
      processNextConnector(
        currentOrderPos + 1,
        createdConnectorsRef.current,
        session.dataSource,
        session.dataSourceType,
        session.processingOrder,
        session.suggestedName
      );
    }
  }, [flowState, processNextConnector]);

  // Get current connector config
  const currentConnectorConfig: StackConnectorConfig | undefined =
    flowState.type === 'flyout' || flowState.type === 'connector_prompt'
      ? stackConnectors[flowState.connectorIndex]
      : undefined;

  // Render flyout
  const flyout = useMemo(() => {
    if (flowState.type !== 'flyout') {
      return null;
    }

    const connectorType = stackConnectors[flowState.connectorIndex]?.type;
    const name = flowState.suggestedName;

    return triggersActionsUi.getAddConnectorFlyout({
      onClose: closeFlyout,
      onConnectorCreated: handleConnectorCreated,
      ...(connectorType && {
        initialConnector: {
          actionTypeId: connectorType,
          ...(name && { name }),
        },
      }),
    });
  }, [flowState, stackConnectors, closeFlyout, handleConnectorCreated, triggersActionsUi]);

  // Render connector prompt (for required and optional connectors after primary)
  const connectorPrompt = useMemo(() => {
    if (flowState.type !== 'connector_prompt' || !currentConnectorConfig) {
      return null;
    }

    return React.createElement(ConnectorPrompt, {
      connectorConfig: currentConnectorConfig,
      role: flowState.role,
      onSetUp: handlePromptSetUp,
      onSkip: handlePromptSkip,
    });
  }, [flowState, currentConnectorConfig, handlePromptSetUp, handlePromptSkip]);

  return {
    openFlyout,
    closeFlyout,
    isOpen: flowState.type !== 'idle' && flowState.type !== 'complete',
    isSaving: createDataSourceMutation.isLoading,
    flyout,
    connectorPrompt,
    // Legacy alias for backwards compatibility
    optionalPrompt: connectorPrompt,
    // Progress info
    currentConnectorIndex:
      flowState.type === 'flyout' || flowState.type === 'connector_prompt'
        ? flowState.connectorIndex
        : -1,
    totalConnectors: stackConnectors.length,
    // Connectors created so far in the current flow
    createdConnectors,
    connectedCount: createdConnectors.length,
  };
};
