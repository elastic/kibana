/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from 'react-router-dom';
import { PLUGIN } from '../../common/constants';
import { patterns } from '../routes';
import { useCore } from './index';

// TODO: get this from server/integrations/handlers.ts (move elsewhere?)
// seems like part of the name@version change
interface DetailParams {
  name: string;
  version: string;
}

function addBasePath(path: string) {
  const { http } = useCore();
  return http.basePath.prepend(path);
}

function appRoot(path: string) {
  // include '#' because we're using HashRouter
  return addBasePath(patterns.APP_ROOT + '#' + path);
}

export function useLinks() {
  return {
    toAssets: (path: string) => addBasePath(`/plugins/${PLUGIN.ID}/assets/${path}`),
    toListView: () => appRoot(patterns.LIST_VIEW),
    toDetailView: ({ name, version }: DetailParams) =>
      appRoot(generatePath(patterns.DETAIL_VIEW, { pkgkey: `${name}-${version}` })),
  };
}
