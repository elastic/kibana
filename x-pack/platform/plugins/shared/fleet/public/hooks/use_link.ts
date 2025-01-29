/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathGetters, PLUGIN_ID } from '../constants';
import type { StaticPage, DynamicPage, DynamicPagePathValues } from '../constants';

import { useStartServices } from '.';

const getSeparatePaths = (
  page: StaticPage | DynamicPage,
  values: DynamicPagePathValues = {}
): [string, string] => {
  return values ? pagePathGetters[page](values) : pagePathGetters[page as StaticPage]();
};

export const useLink = () => {
  const core = useStartServices();
  return {
    getPath: (page: StaticPage | DynamicPage, values: DynamicPagePathValues = {}): string => {
      return getSeparatePaths(page, values)[1];
    },
    getAbsolutePath: (path: string): string => {
      return core.http.basePath.prepend(`${path}`);
    },
    getAssetsPath: (path: string) =>
      core.http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/${path}`),
    getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => {
      const [basePath, path] = getSeparatePaths(page, values);
      return core.http.basePath.prepend(`${basePath}${path}`);
    },
  };
};
