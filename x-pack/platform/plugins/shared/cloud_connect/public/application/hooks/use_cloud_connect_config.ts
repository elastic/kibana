/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useCloudConnectedAppContext } from '../app_context';

interface CloudConnectConfig {
  hasEncryptedSOEnabled: boolean;
}

interface UseCloudConnectConfigResult {
  hasEncryptedSOEnabled: boolean | undefined;
  isLoading: boolean;
}

export const useCloudConnectConfig = (): UseCloudConnectConfigResult => {
  const { http } = useCloudConnectedAppContext();
  const [hasEncryptedSOEnabled, setHasEncryptedSOEnabled] = useState<boolean | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await http.get<CloudConnectConfig>('/internal/cloud_connect/config');
        setHasEncryptedSOEnabled(data.hasEncryptedSOEnabled);
      } catch (error) {
        // Default to false if we can't fetch config
        setHasEncryptedSOEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [http]);

  return { hasEncryptedSOEnabled, isLoading };
};
