/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { useKibana } from '../../common/lib/kibana';

/**
 * Returns a `setBreadcrumbs` function that automatically populates project-style
 * breadcrumbs (used by solution/serverless chrome) in addition to the classic
 * breadcrumbs, so that pages show meaningful breadcrumb text instead of the
 * default "Kibana" root crumb when running in solution or serverless view.
 */
export const useSetBreadcrumbs = () => {
  const { chrome } = useKibana().services;
  const [chromeStyle, setChromeStyle] = useState<string | undefined>(undefined);

  useEffect(() => {
    const subscription = chrome.getChromeStyle$().subscribe(setChromeStyle);
    return () => subscription.unsubscribe();
  }, [chrome]);

  return useCallback(
    (breadcrumbs: ChromeBreadcrumb[]) => {
      chrome.setBreadcrumbs(
        breadcrumbs,
        chromeStyle === 'project' ? { project: { value: breadcrumbs } } : undefined
      );
    },
    [chrome, chromeStyle]
  );
};
