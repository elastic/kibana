/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MANAGEMENT_APP_ID } from '@kbn/deeplinks-management/constants';

export const CONTENT_CONNECTORS_MANAGEMENT_PATH = '/data/content_connectors';

export const getContentConnectorsUrl = (
  getUrlForApp: ((appId: string, options?: { path?: string }) => string) | undefined,
  path = ''
): string => {
  const base = getUrlForApp?.(MANAGEMENT_APP_ID, {
    path: CONTENT_CONNECTORS_MANAGEMENT_PATH,
  });
  return `${base ?? ''}${path}`;
};
