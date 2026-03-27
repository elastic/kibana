/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { NO_DEFAULT_MODEL } from '../../common/constants';
import { APIRoutes } from '../../common/types';
import { useKibana } from './use_kibana';

export const useConnectorExists = (connectorId: string): { exists: boolean; loading: boolean } => {
  const { services } = useKibana();
  const { http } = services;

  const [exists, setExists] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connectorId || connectorId === NO_DEFAULT_MODEL) {
      setExists(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    http
      .get(APIRoutes.GET_CONNECTOR_BY_ID.replace('{connectorId}', connectorId), {
        signal: controller.signal,
      })
      .then(() => setExists(true))
      .catch((e) => {
        if ((e as any)?.name !== 'AbortError') {
          setExists(false);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [connectorId, http]);

  return { exists, loading };
};
