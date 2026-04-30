/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { SavedObjectsServiceSetup } from '@kbn/core/server';

export const SML_CRAWLER_GRANT_SAVED_OBJECT_TYPE = 'sml-crawler-grant';

export interface SmlCrawlerGrantSavedObjectAttributes {
  username: string;
  attachment_type: string;
}

export const buildSmlCrawlerGrantId = (username: string, attachmentType: string): string =>
  createHash('sha256').update(`${username}\n${attachmentType}`, 'utf8').digest('hex');

export const registerSmlCrawlerGrantSavedObjectType = ({
  savedObjects,
}: {
  savedObjects: SavedObjectsServiceSetup;
}) => {
  savedObjects.registerType({
    name: SML_CRAWLER_GRANT_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {
        username: { type: 'keyword' },
        attachment_type: { type: 'keyword' },
      },
    },
    migrations: {},
  });
};
