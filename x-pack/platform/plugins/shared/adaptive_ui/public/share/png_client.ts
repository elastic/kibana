/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { ViewSpec } from '@kbn/adaptive-ui';
import { adaptiveUiApiPaths } from '../../common/http_api';

/** Rasterizes a spec through the server route, which owns the native renderer. */
export const fetchViewPng = async (http: HttpStart, spec: ViewSpec): Promise<Blob> => {
  const { response } = await http.post(adaptiveUiApiPaths.renderPng, {
    body: JSON.stringify({ spec }),
    asResponse: true,
    rawResponse: true,
  });

  if (!response) {
    throw new Error('The PNG route returned no response.');
  }

  return await response.blob();
};
