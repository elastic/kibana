/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { InputTextFieldSchema } from './input_text';
import { SelectBasicFieldSchema } from './select_basic';

/**
 * This can be used to parse `fields` section in the YAML `definition` of the template.
 */
export const FieldSchema = z.discriminatedUnion('control', [
  InputTextFieldSchema,
  SelectBasicFieldSchema,
]);
