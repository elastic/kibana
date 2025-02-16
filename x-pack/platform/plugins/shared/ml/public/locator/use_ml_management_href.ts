/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { MlPluginSetup } from '..';
import type { MlLocatorParams } from '../../common/types/locator';

/**
 * Provides a URL to ML management pages
 * TODO remove basePath parameter
 */
export const useMlManagementHref = (
  ml: MlPluginSetup | undefined,
  params: MlLocatorParams,
  appId: string = 'anomaly_detection'
) => {
  const [mlManagementUrl, setMlManagementUrl] = useState();

  useEffect(
    function setUpMlUrl() {
      const getUrl = async () => {
        let url;

        if (ml && ml.managementLocator) {
          // @ts-ignore - TODO: fix
          const result = await ml.managementLocator?.getUrl(params, appId);
          url = result.url;
        }

        setMlManagementUrl(url);
      };

      getUrl();
    },
    [appId, params, ml]
  );

  return mlManagementUrl;
};
