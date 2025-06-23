/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import type { MlLocatorParams } from '@kbn/ml-common-types/locator';
import type { MlPluginSetup } from '@kbn/ml-common-types/plugin';

/**
 * Provides a URL to ML management pages
 */
export const useMlManagementHref = (
  ml: MlPluginSetup | undefined,
  params: MlLocatorParams,
  appId: string = 'anomaly_detection'
) => {
  const [mlManagementUrl, setMlManagementUrl] = useState<string | undefined>(undefined);

  useEffect(
    function setUpMlUrl() {
      const getUrl = async () => {
        if (ml && ml.getManagementLocator) {
          const managementLocator = await ml.getManagementLocator();
          const result = await managementLocator.getUrl(params, appId);
          if (result.url) {
            setMlManagementUrl(result.url);
          }
        }
      };

      getUrl();
    },
    [appId, params, ml]
  );

  return mlManagementUrl;
};
