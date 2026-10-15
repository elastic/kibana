/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { CONTEXT_ENGINE_APP_ID } from '../../../common/features';
import { clearAppBreadcrumbsViaCore, setAppBreadcrumbsViaCore } from '../utils/set_app_breadcrumbs';
import { useKibana } from './use_kibana';

export interface ContextEngineBreadcrumb {
  text: string;
  /** Path within the Context Engine app to link to; omit for the current (non-clickable) page. */
  path?: string;
}

const contextTitle = i18n.translate('xpack.contextEngine.landing.breadcrumbs.title', {
  defaultMessage: 'Context',
});

/**
 * Sets breadcrumbs for the Context Engine app.
 *
 * Each page passes its own trail, from directly under the app root down to itself
 * (e.g. `[{ text: aiIndexId, path }, { text: kiTitle }]`); this hook prepends the
 * shared Build > Context root in classic chrome and resolves `path` to an href.
 */
export const useContextEngineBreadcrumbs = (breadcrumbs: ContextEngineBreadcrumb[] = []) => {
  const { application, appChrome, chrome } = useKibana().services;
  const chromeStyle = chrome.getChromeStyle();

  useEffect(() => {
    const getHref = (path: string) => application.getUrlForApp(CONTEXT_ENGINE_APP_ID, { path });

    const tail: ChromeBreadcrumb[] = breadcrumbs.map(({ text, path }) => ({
      text,
      href: path !== undefined ? getHref(path) : undefined,
    }));

    const allBreadcrumbs: ChromeBreadcrumb[] =
      chromeStyle === 'classic'
        ? [
            {
              text: i18n.translate('xpack.contextEngine.breadcrumbs.build', {
                defaultMessage: 'Build',
              }),
            },
            { text: contextTitle, href: tail.length > 0 ? getHref('') : undefined },
            ...tail,
          ]
        : tail;

    const didSetBreadcrumbs = chromeStyle === 'classic' || allBreadcrumbs.length > 0;

    if (didSetBreadcrumbs) {
      if (appChrome) {
        appChrome.breadcrumbs.setAppBreadcrumbs(allBreadcrumbs);
      } else {
        setAppBreadcrumbsViaCore(chrome, chromeStyle, allBreadcrumbs);
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
  }, [breadcrumbs, application, appChrome, chrome, chromeStyle]);
};
