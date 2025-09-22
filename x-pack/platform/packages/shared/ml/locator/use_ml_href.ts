/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { DependencyList } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

import type { MlLocatorParams } from '@kbn/ml-common-types/locator';
import type { MlPluginSetup } from '@kbn/ml-plugin-contracts';

/**
 * Provides a URL to ML plugin page
 * TODO remove basePath parameter
 */
export const useMlHref = (
  ml: MlPluginSetup | undefined,
  basePath: string | undefined,
  params: MlLocatorParams,
  dependencies?: DependencyList
) => {
  const [url, setUrl] = useState<string>('');
  const isMounted = useMountedState();

  useEffect(() => {
    async function getUrl() {
      if (!ml?.locator) {
        setUrl('');
        return;
      }

      try {
        const result = await ml.locator.getUrl(params);
        if (!isMounted()) return;
        setUrl(result);
      } catch (error) {
        if (!isMounted()) return;
        // eslint-disable-next-line no-console
        console.error('useMlHref', error);
        setUrl('');
      }
    }

    getUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ml, isMounted, ...Object.values(params), ...(dependencies || [])]);

  return url;
};
