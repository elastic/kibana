/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useCloudConnectedAppContext } from '../app_context';
import { PLUGIN_NAME } from '../../../common';

export const useBreadcrumbs = () => {
  const { chrome } = useCloudConnectedAppContext();

  useEffect(() => {
    const breadcrumbs = [
      {
        text: 'Kibana',
        href: '/',
      },
      {
        text: PLUGIN_NAME,
      },
    ];

    chrome.setBreadcrumbs(breadcrumbs);
    chrome.docTitle.change(PLUGIN_NAME);
  }, [chrome]);
};
