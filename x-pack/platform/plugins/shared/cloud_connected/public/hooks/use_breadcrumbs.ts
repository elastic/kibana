/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { ChromeStart, ApplicationStart } from '@kbn/core/public';
import { PLUGIN_NAME } from '../../common';

const SERVICES_BREADCRUMB = i18n.translate('xpack.cloudConnected.breadcrumbs.services', {
  defaultMessage: 'Services',
});

export const useBreadcrumbs = (
  chrome: ChromeStart,
  application: ApplicationStart,
  pathname: string
) => {
  useEffect(() => {
    const isServicesPage = pathname === '/services';

    const breadcrumbs = [
      {
        text: 'Kibana',
        href: '/',
      },
      {
        text: PLUGIN_NAME,
        ...(isServicesPage
          ? {
              href: application.getUrlForApp('cloud_connected', { path: '/' }),
            }
          : {}),
      },
    ];

    if (isServicesPage) {
      breadcrumbs.push({
        text: SERVICES_BREADCRUMB,
      });
    }

    chrome.setBreadcrumbs(breadcrumbs);
    chrome.docTitle.change(isServicesPage ? SERVICES_BREADCRUMB : PLUGIN_NAME);
  }, [chrome, application, pathname]);
};
