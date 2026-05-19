/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useKibana } from './use_kibana';

/**
 * Sets breadcrumbs for the Search Inference Endpoints pages.
 *
 * In project chrome (serverless or solution spaces), the navigation tree provides
 * the base path automatically. In classic chrome, we need to set the breadcrumbs manually.
 */
export const useBreadcrumbs = (breadcrumbText: string) => {
  const { setBreadcrumbs, chrome } = useKibana().services;
  const chromeStyle = chrome.getChromeStyle();

  useEffect(() => {
    if (chromeStyle !== 'classic') {
      return;
    }

    setBreadcrumbs([{ text: breadcrumbText }]);
  }, [setBreadcrumbs, chromeStyle, breadcrumbText]);
};
