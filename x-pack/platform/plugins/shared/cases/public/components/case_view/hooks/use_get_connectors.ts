/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { InferenceConnector } from '@kbn/inference-common';
import { useKibana } from '../../../common/lib/kibana';

export function useGetConnectors() {
  const { http } = useKibana().services;
  const [isLoading, setIsLoading] = useState(false);
  const [connectors, setConnectors] = useState<InferenceConnector[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const getConnectors = useCallback(async () => {
    const apiPath = '/internal/inference/connectors';
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.get<{ connectors: InferenceConnector[] }>(apiPath);
      setConnectors(response.connectors);
    } catch (err) {
      setError(err as Error);
      setConnectors([]);
    } finally {
      setIsLoading(false);
    }
  }, [http]);

  return { isLoading, connectors, error, getConnectors };
}
