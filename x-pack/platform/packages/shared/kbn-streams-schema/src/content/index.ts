/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

interface ContentPack {
  content: string;
}

const contentPackSchema: z.Schema<ContentPack> = z.object({
  content: z.string(),
});

export { contentPackSchema, type ContentPack };
