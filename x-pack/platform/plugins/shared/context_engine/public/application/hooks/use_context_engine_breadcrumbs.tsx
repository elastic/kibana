/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { CONTEXT_ENGINE_APP_PATH } from '../../../common/features';
import { clearAppBreadcrumbsViaCore, setAppBreadcrumbsViaCore } from '../utils/set_app_breadcrumbs';
import { useKibana } from './use_kibana';

const contextTitle = i18n.translate('xpack.contextEngine.landing.breadcrumbs.title', {
  defaultMessage: 'Context',
});

/**
 * Sets breadcrumbs for the Context Engine app.
 *
 * In project chrome, the navigation tree provides the base path.
 * In classic chrome, we set the Build > Context path manually.
 */
export const useContextEngineBreadcrumbs = (pageName?: string) => {
  const { http, appChrome, chrome } = useKibana().services;
  const chromeStyle = chrome.getChromeStyle();

  useEffect(() => {
    const breadcrumbs: ChromeBreadcrumb[] = [];

    if (chromeStyle === 'classic') {
      breadcrumbs.push({
        text: i18n.translate('xpack.contextEngine.breadcrumbs.build', {
          defaultMessage: 'Build',
        }),
      });
      breadcrumbs.push({
        text: contextTitle,
        href: pageName !== undefined ? http.basePath.prepend(CONTEXT_ENGINE_APP_PATH) : undefined,
      });
    }

    if (pageName !== undefined) {
      breadcrumbs.push({ text: pageName });
    }

    const didSetBreadcrumbs = breadcrumbs.length > 0;

    if (didSetBreadcrumbs) {
      if (appChrome) {
        appChrome.breadcrumbs.setAppBreadcrumbs(breadcrumbs);
      } else {
        setAppBreadcrumbsViaCore(chrome, chromeStyle, breadcrumbs);
      }
    }

    return () => {
      if (!didSetBreadcrumbs) {
        return;
      }

      if (appChrome) {
        appChrome.breadcrumbs.clearBreadcrumbs();
      } else {
        clearAppBreadcrumbsViaCore(chrome);
      }
    };
  }, [http, appChrome, chrome, chromeStyle, pageName]);
};
