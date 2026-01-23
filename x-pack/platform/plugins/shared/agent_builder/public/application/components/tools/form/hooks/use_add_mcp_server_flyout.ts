/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE } from '@kbn/connector-schemas/mcp/constants';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFlyoutState } from '../../../../hooks/use_flyout_state';
import { queryKeys } from '../../../../query_keys';

export interface UseAddMcpServerFlyoutOptions {
  onConnectorCreated?: (connector: ActionConnector) => void;
}

export const useAddMcpServerFlyout = ({
  onConnectorCreated,
}: UseAddMcpServerFlyoutOptions = {}) => {
  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const { openFlyout, closeFlyout, isOpen } = useFlyoutState();

  // Refresh the list of MCP connectors when a new MCP connector is created
  const handleConnectorCreated = useCallback(
    (connector: ActionConnector) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tools.connectors.list(MCP_CONNECTOR_TYPE),
      });
      onConnectorCreated?.(connector);
    },
    [queryClient, onConnectorCreated]
  );

  const flyout = useMemo(
    () =>
      triggersActionsUi.getAddConnectorFlyout({
        onClose: closeFlyout,
        onConnectorCreated: handleConnectorCreated,
        initialConnector: {
          actionTypeId: MCP_CONNECTOR_TYPE,
        },
      }),
    [closeFlyout, handleConnectorCreated, triggersActionsUi]
  );

  return {
    openFlyout,
    closeFlyout,
    isOpen,
    flyout,
  };
};
