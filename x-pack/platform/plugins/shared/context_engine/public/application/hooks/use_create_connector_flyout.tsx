/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { ContextEngineConnectorFeatureId } from '@kbn/actions-plugin/common';
import { useBoolean } from '@kbn/react-hooks';
import { useQueryClient } from '@kbn/react-query';
import { noop } from 'lodash';
import { useCallback, useMemo } from 'react';
import { contextEngineQueryKeys } from './query_keys';
import { useCanReadConnectors } from './use_can_read_connectors';
import { useKibana } from './use_kibana';

interface UseCreateConnectorFlyoutParams {
  onConnectorCreated: (params: { id: string; name: string; checked: boolean }) => void;
}

export const useCreateConnectorFlyout = ({
  onConnectorCreated,
}: UseCreateConnectorFlyoutParams) => {
  const [isCreateFlyoutOpen, { on: openCreateFlyout, off: closeCreateFlyout }] = useBoolean(false);
  const queryClient = useQueryClient();
  const {
    services: { application, triggersActionsUi },
  } = useKibana();

  const canCreateConnector = application?.capabilities.actions?.save === true;
  const canReadConnectors = useCanReadConnectors();

  const invalidateConnectorQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.connectors.list() });
  }, [queryClient]);

  const handleConnectorCreated = useCallback(
    (connector: ActionConnector) => {
      invalidateConnectorQueries();
      onConnectorCreated({ id: connector.id, name: connector.name, checked: true });
    },
    [invalidateConnectorQueries, onConnectorCreated]
  );

  const handleCloseCreateFlyout = useCallback(() => {
    invalidateConnectorQueries();
    closeCreateFlyout();
  }, [closeCreateFlyout, invalidateConnectorQueries]);

  const createConnectorFlyout = useMemo(
    () =>
      isCreateFlyoutOpen
        ? triggersActionsUi.getAddConnectorFlyout({
            featureId: ContextEngineConnectorFeatureId,
            size: 'm',
            onClose: handleCloseCreateFlyout,
            onConnectorCreated: handleConnectorCreated,
            onTestConnector: noop,
          })
        : null,
    [handleCloseCreateFlyout, handleConnectorCreated, isCreateFlyoutOpen, triggersActionsUi]
  );

  return {
    canCreateConnector,
    canReadConnectors,
    openCreateFlyout,
    createConnectorFlyout,
  };
};
