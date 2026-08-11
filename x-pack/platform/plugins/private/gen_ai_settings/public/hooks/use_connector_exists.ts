/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { NO_DEFAULT_CONNECTOR } from '../../common/constants';
import { useKibana } from './use_kibana';

/**
 * Checks whether a given connector ID actually exists by fetching it directly
 * from the inference plugin. This avoids false negatives from the deduped
 * connector list returned by getConnectorList.
 */
export function useConnectorExists(connectorId: string): {
  exists: boolean;
  loading: boolean;
} {
  const {
    services: { genAiSettingsApi },
  } = useKibana();

  const [exists, setExists] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connectorId || connectorId === NO_DEFAULT_CONNECTOR) {
      setExists(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    genAiSettingsApi('GET /internal/gen_ai_settings/connectors/{connectorId}', {
      signal: controller.signal,
      params: { path: { connectorId } },
    })
      .then(() => {
        setExists(true);
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') {
          setExists(false);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [connectorId, genAiSettingsApi]);

  return { exists, loading };
}
