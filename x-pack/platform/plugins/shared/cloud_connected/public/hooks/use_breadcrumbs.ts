/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ChromeStart } from '@kbn/core/public';
import { PLUGIN_NAME } from '../../common';

export const useBreadcrumbs = (chrome: ChromeStart) => {
  useEffect(() => {
    chrome.setBreadcrumbs([
      {
        text: 'Kibana',
        href: '/',
      },
      {
        text: PLUGIN_NAME,
      },
    ]);

    chrome.docTitle.change(PLUGIN_NAME);
  }, [chrome]);
};
