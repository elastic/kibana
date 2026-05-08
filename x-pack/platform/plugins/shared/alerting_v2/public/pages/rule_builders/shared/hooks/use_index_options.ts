/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';

interface ResolveIndexResponse {
  indices: Array<{ name: string }>;
}

export interface IndexOption {
  label: string;
}

export const useIndexOptions = ({ http }: { http: HttpStart }) => {
  const [options, setOptions] = useState<IndexOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOptions = useCallback(
    async (searchValue: string) => {
      if (!searchValue) {
        setOptions([]);
        return;
      }
      setIsLoading(true);
      try {
        const response = await http.get<ResolveIndexResponse>(
          `/internal/index-pattern-management/resolve_index/${encodeURIComponent(
            `${searchValue}*`
          )}`
        );
        setOptions((response.indices ?? []).map((idx) => ({ label: idx.name })));
      } catch {
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [http]
  );

  return { options, isLoading, fetchOptions };
};
