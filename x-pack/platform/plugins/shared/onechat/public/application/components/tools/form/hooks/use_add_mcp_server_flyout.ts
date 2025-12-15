/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE } from '@kbn/connector-schemas/mcp/constants';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFlyoutState } from '../../../../hooks/use_flyout_state';
import { queryKeys } from '../../../../query_keys';

export const useAddMcpServerFlyout = () => {
  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const { openFlyout, closeFlyout, isOpen } = useFlyoutState();

  // Refresh the list of MCP connectors when a new MCP connector is created
  const handleConnectorCreated = useCallback(
    (_: ActionConnector) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tools.connectors.list(MCP_CONNECTOR_TYPE),
      });
    },
    [queryClient]
  );

  const flyout = triggersActionsUi.getAddConnectorFlyout({
    onClose: closeFlyout,
    onConnectorCreated: handleConnectorCreated,
    initialConnector: {
      actionTypeId: MCP_CONNECTOR_TYPE,
    },
  });

  return {
    openFlyout,
    closeFlyout,
    isOpen,
    flyout,
  };
};
