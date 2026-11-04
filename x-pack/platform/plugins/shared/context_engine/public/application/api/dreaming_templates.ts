/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import {
  DREAMING_TEMPLATES_ASSET_DIR,
  type DreamingTemplate,
  type DreamingTemplateIndex,
} from '../../../common/dreaming_templates';

interface FetchArgs {
  signal?: AbortSignal;
}

const getAsset = <T>(http: HttpStart, file: string, { signal }: FetchArgs): Promise<T> =>
  http.get<T>(http.staticAssets.getPluginAssetHref(`${DREAMING_TEMPLATES_ASSET_DIR}/${file}`), {
    // The href already carries the base path, or points at the CDN.
    prependBasePath: false,
    ...(signal ? { signal } : {}),
  });

/** Lists the example dreaming configs offered when an AI index is created. */
export const listDreamingTemplates = (
  http: HttpStart,
  args: FetchArgs = {}
): Promise<DreamingTemplateIndex> => getAsset(http, 'index.json', args);

/** Loads one example dreaming config. */
export const getDreamingTemplate = (
  http: HttpStart,
  { id, ...args }: FetchArgs & { id: string }
): Promise<DreamingTemplate> => getAsset(http, `${encodeURIComponent(id)}.json`, args);
