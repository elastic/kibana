/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import {
  FONTS_API_PATH,
  MVT_GETTILE_API_PATH,
  MVT_GETGRIDTILE_API_PATH,
} from '../../../common/constants';

/**
 * This URL could be used from inside a Worker which may have a different base
 * URL. This function takes a string that may be a path and converts it to an
 * absolute URL.
 */
function prepareAbsoluteUrl(pathOrUrl: string): string {
  pathOrUrl = pathOrUrl.trim();
  if (pathOrUrl.startsWith('/')) {
    return new URL(pathOrUrl, window.location.origin).toString();
  }
  return pathOrUrl;
}

/**
 * @param pathOrUrl - Assumed to be a full URL or a path starting with "/"
 * @param resourceType - Indicator of what type of resource is being requested
 */
export function transformRequest(pathOrUrl: string, resourceType: string | undefined) {
  const url = prepareAbsoluteUrl(pathOrUrl);
  if (resourceType === 'Glyphs' && url.includes(FONTS_API_PATH)) {
    return {
      url,
      method: 'GET' as 'GET',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      },
    };
  }

  if (resourceType === 'Tile' && url.includes(MVT_GETTILE_API_PATH)) {
    return {
      url,
      method: 'GET' as 'GET',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      },
    };
  }

  if (resourceType === 'Tile' && url.includes(MVT_GETGRIDTILE_API_PATH)) {
    return {
      url,
      method: 'GET' as 'GET',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      },
    };
  }

  return { url };
}
