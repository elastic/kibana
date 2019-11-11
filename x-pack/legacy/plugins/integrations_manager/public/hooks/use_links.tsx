/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from 'react-router-dom';
import { PLUGIN } from '../../common/constants';
import { getFilePath, getInfoPath } from '../../common/routes';
import { patterns } from '../routes';
import { useCore } from '.';
import { DetailViewPanelName } from '..';

// TODO: get this from server/packages/handlers.ts (move elsewhere?)
// seems like part of the name@version change
interface DetailParams {
  name: string;
  version: string;
  panel?: DetailViewPanelName;
}

const removeRelativePath = (relativePath: string): string =>
  new URL(relativePath, 'http://example.com').pathname;

export function useLinks() {
  const { http } = useCore();
  function appRoot(path: string) {
    // include '#' because we're using HashRouter
    return http.basePath.prepend(patterns.APP_ROOT + '#' + path);
  }

  return {
    toAssets: (path: string) => http.basePath.prepend(`/plugins/${PLUGIN.ID}/assets/${path}`),
    toImage: (path: string) => http.basePath.prepend(getFilePath(path)),
    toRelativeImage: ({
      path,
      packageName,
      version,
    }: {
      path: string;
      packageName: string;
      version: string;
    }) => {
      const imagePath = removeRelativePath(path);
      const pkgkey = `${packageName}-${version}`;
      const filePath = `${getInfoPath(pkgkey)}/${imagePath}`;
      return http.basePath.prepend(filePath);
    },
    toListView: () => appRoot(patterns.LIST_VIEW),
    toDetailView: ({ name, version, panel }: DetailParams) => {
      // panel is optional, but `generatePath` won't accept `path: undefined`
      // so use this to pass `{ pkgkey }` or `{ pkgkey, panel }`
      const params = Object.assign({ pkgkey: `${name}-${version}` }, panel ? { panel } : {});
      return appRoot(generatePath(patterns.DETAIL_VIEW, params));
    },
  };
}
