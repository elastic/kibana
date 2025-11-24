/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { StaticToolRegistration } from '../tools/builtin';

/**
 * Definition of a tool which is bounded to an attachment instance.
 *
 * Refer to {@link AttachmentTypeDefinition}.
 */
export type AttachmentBoundedTool<RunInput extends ZodObject<any> = ZodObject<any>> = Omit<
  StaticToolRegistration<RunInput>,
  'availability' | 'tags'
>;
