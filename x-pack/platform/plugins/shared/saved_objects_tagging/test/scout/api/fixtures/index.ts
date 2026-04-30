/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestAuthFixture, RoleApiCredentials } from '@kbn/scout';
import { apiTest as base } from '@kbn/scout';

export interface SavedObjectsTaggingRequestAuthFixture extends RequestAuthFixture {
  getTagsEditorApiKey: () => Promise<RoleApiCredentials>;
  getTagsViewerApiKey: () => Promise<RoleApiCredentials>;
}

export const apiTest = base.extend<{
  requestAuth: SavedObjectsTaggingRequestAuthFixture;
}>({
  requestAuth: async ({ requestAuth }, use) => {
    const getTagsEditorApiKey = () =>
      requestAuth.getApiKeyForCustomRole({
        elasticsearch: {
          cluster: [],
          indices: [],
        },
        kibana: [
          {
            base: [],
            feature: {
              savedObjectsTagging: ['all'],
            },
            spaces: ['*'],
          },
        ],
      });

    const getTagsViewerApiKey = () =>
      requestAuth.getApiKeyForCustomRole({
        elasticsearch: {
          cluster: [],
          indices: [],
        },
        kibana: [
          {
            base: [],
            feature: {
              savedObjectsTagging: ['read'],
            },
            spaces: ['*'],
          },
        ],
      });

    const extended: SavedObjectsTaggingRequestAuthFixture = {
      ...requestAuth,
      getTagsEditorApiKey,
      getTagsViewerApiKey,
    };

    await use(extended);
  },
});

export * as testData from './constants';
