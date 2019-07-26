/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ChromeBreadcrumb } from 'src/core/public/chrome';
import { useCore } from '../hooks';

export function useBreadcrumbs(newBreadcrumbs: ChromeBreadcrumb[]) {
  const { chrome } = useCore();
  return chrome.setBreadcrumbs(newBreadcrumbs);
}
