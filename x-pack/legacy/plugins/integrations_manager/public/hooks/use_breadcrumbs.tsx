/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChromeBreadcrumb } from 'src/core/public';
import { useCore } from '.';

export function useBreadcrumbs(newBreadcrumbs: ChromeBreadcrumb[]) {
  const { chrome } = useCore();
  return chrome.setBreadcrumbs(newBreadcrumbs);
}
