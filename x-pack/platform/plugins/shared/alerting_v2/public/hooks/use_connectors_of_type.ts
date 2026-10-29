/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { fetchConnectors } from '@kbn/alerts-ui-shared/src/common/apis';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import { importKeys } from './query_key_factory';

/** The user's own connectors of one type, for example every Datadog connector. */
export const useConnectorsOfType = (connectorTypeId: string) => {
  const http = useService(CoreStart('http'));

  return useQuery<ActionConnector[], Error>({
    queryKey: importKeys.connectors(connectorTypeId),
    queryFn: async () => {
      const connectors = await fetchConnectors({ http });
      return connectors.filter(({ actionTypeId }) => actionTypeId === connectorTypeId);
    },
  });
};
