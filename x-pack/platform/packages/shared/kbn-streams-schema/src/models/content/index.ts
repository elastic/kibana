/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SavedObject } from '@kbn/core/server';

type ContentPackVersion = 'v1';

interface ContentPackHeader {
  content_pack_version: ContentPackVersion;
}

const contentPackHeaderSchema: z.Schema<ContentPackHeader> = z.object({
  content_pack_version: z.literal('v1'),
});

interface ContentPackSavedObject {
  type: 'saved_object';
  content: SavedObject;
}

export { contentPackHeaderSchema, type ContentPackHeader, type ContentPackSavedObject };
