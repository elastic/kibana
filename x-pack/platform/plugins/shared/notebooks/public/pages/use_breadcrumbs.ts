/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { APP_ID, PLUGIN_NAME } from '../../common/constants';
import { useNotebookServices } from '../services';

/**
 * Sets the chrome breadcrumbs to the notebook listing, followed by `title` when given, and by an
 * app's title, with `title` linking back to its notebook, when `app` is given.
 */
export const useBreadcrumbs = (
  title?: string,
  app?: { title: string; notebookPath: string }
): void => {
  const { core } = useNotebookServices();
  const appTitle = app?.title;
  const notebookPath = app?.notebookPath;
  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        text: PLUGIN_NAME,
        href: core.application.getUrlForApp(APP_ID),
      },
      ...(title
        ? [
            {
              text: title,
              href: notebookPath
                ? core.application.getUrlForApp(APP_ID, { path: notebookPath })
                : undefined,
            },
          ]
        : []),
      ...(appTitle ? [{ text: appTitle }] : []),
    ]);
  }, [core, title, appTitle, notebookPath]);
};
