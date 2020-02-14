/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FormSchema } from '../../../shared_imports';
import { schema as createSchema } from '../create/schema';

export const schema: FormSchema = {
  tags: createSchema.tags,
};
