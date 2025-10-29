/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AIConnector } from '@kbn/elastic-assistant';

interface UseDefaultConnectorParams {
  connectors: AIConnector[];
  defaultConnectorId?: string;
}

export function useDefaultConnector({
  connectors,
  defaultConnectorId,
}: UseDefaultConnectorParams): string | undefined {
  return useMemo(() => {
    if (connectors.length === 0) {
      return undefined;
    }

    // 1. Try defaultConnectorId (GenAI setting) first
    if (defaultConnectorId && connectors.some((c) => c.id === defaultConnectorId)) {
      return defaultConnectorId;
    }

    // 2. If no default, try to find a preconfigured connector (Elastic-managed LLM)
    const preconfiguredConnector = connectors.find((c) => c.isPreconfigured);
    if (preconfiguredConnector) {
      return preconfiguredConnector.id;
    }

    // 3. If no preconfigured connector, use the first custom connector
    return connectors[0]?.id;
  }, [connectors, defaultConnectorId]);
}
