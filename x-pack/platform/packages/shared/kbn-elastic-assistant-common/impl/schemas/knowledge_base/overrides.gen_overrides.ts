/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// OAS does not support optional path parameters, so we override the generated schemas here.
// Named *.gen_overrides.ts to signal that this file modifies generated output.

import type { z } from '@kbn/zod/v4';
import {
  CreateKnowledgeBaseRequestParams as CreateKnowledgeBaseRequestParamsBase,
  ReadKnowledgeBaseRequestParams as ReadKnowledgeBaseRequestParamsBase,
} from './crud_kb_route.gen';

export const CreateKnowledgeBaseRequestParams = CreateKnowledgeBaseRequestParamsBase.extend({
  resource: CreateKnowledgeBaseRequestParamsBase.shape.resource.optional(),
});
export type CreateKnowledgeBaseRequestParams = z.infer<typeof CreateKnowledgeBaseRequestParams>;

export const ReadKnowledgeBaseRequestParams = ReadKnowledgeBaseRequestParamsBase.extend({
  resource: ReadKnowledgeBaseRequestParamsBase.shape.resource.optional(),
});
export type ReadKnowledgeBaseRequestParams = z.infer<typeof ReadKnowledgeBaseRequestParams>;
