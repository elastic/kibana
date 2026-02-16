/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useRunningQueriesAppContext } from '../app_context';

const PLUGIN_NAME = i18n.translate('xpack.runningQueries.breadcrumb', {
  defaultMessage: 'Running queries',
});

export const useBreadcrumbs = () => {
  const { chrome } = useRunningQueriesAppContext();

  useEffect(() => {
    chrome.setBreadcrumbs([
      {
        text: i18n.translate('xpack.runningQueries.breadcrumb.management', {
          defaultMessage: 'Management',
        }),
        href: '/',
      },
      {
        text: PLUGIN_NAME,
      },
    ]);
    chrome.docTitle.change(PLUGIN_NAME);
  }, [chrome]);
};
