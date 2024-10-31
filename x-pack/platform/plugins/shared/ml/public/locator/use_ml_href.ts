/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { DependencyList } from 'react';
import type { MlLocatorParams } from '@kbn/ml-common-types/locator';
import type { MlPluginSetup } from '..';

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

  useEffect(() => {
    async function getUrl() {
      if (ml?.getLocator) {
        setUrl((await ml.getLocator()).useUrl(params, undefined, dependencies));
      }
    }

    getUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return url;
};
