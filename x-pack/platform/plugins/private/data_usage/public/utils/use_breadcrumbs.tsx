/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb, ChromeStart } from '@kbn/core-chrome-browser';

import { useEffect } from 'react';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';

export const useBreadcrumbs = (
  breadcrumbs: ChromeBreadcrumb[],
  params: ManagementAppMountParams,
  chromeService: ChromeStart
) => {
  const { docTitle } = chromeService;
  const isMultiple = breadcrumbs.length > 1;

  const docTitleValue = isMultiple ? breadcrumbs[breadcrumbs.length - 1].text : breadcrumbs[0].text;

  docTitle.change(docTitleValue as string);

  useEffect(() => {
    params.setBreadcrumbs(breadcrumbs);
  }, [breadcrumbs, params]);
};
