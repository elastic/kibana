/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { fetchConnector } from '@kbn/alerts-ui-shared/src/common/apis';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

interface EditConnectorFlyoutProps {
  connectorId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

/** The connector's own edit flyout from Stack Management, opened for the connector of an import. */
export const EditConnectorFlyout = ({
  connectorId,
  onClose,
  onUpdated,
}: EditConnectorFlyoutProps) => {
  const http = useService(CoreStart('http'));
  const triggersActionsUi = useService(
    PluginStart<TriggersAndActionsUIPublicPluginStart>('triggersActionsUi')
  );
  const { data: connector } = useQuery<ActionConnector, Error>({
    queryKey: ['alertingV2', 'imports', 'editConnector', connectorId],
    queryFn: () => fetchConnector(connectorId, { http }),
    cacheTime: 0,
  });

  if (!connector) {
    return null;
  }

  return triggersActionsUi.getEditConnectorFlyout({
    connector,
    onClose,
    onConnectorUpdated: () => onUpdated?.(),
  });
};
