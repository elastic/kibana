/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getWindow } from '../../lib/get_window';
import { CANVAS_APP } from '../../../common/lib/constants';
import { getCoreStart, getStartPlugins } from '../../legacy';

export function trackRouteChange() {
  const basePath = getCoreStart().http.basePath.get();
  // storage.set(LOCALSTORAGE_LASTPAGE, pathname);
  getStartPlugins().__LEGACY.trackSubUrlForApp(
    CANVAS_APP,
    getStartPlugins().__LEGACY.absoluteToParsedUrl(get(getWindow(), 'location.href'), basePath)
  );
}
