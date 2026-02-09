/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import { SelectBasicFieldSchema } from '../../../../../common/types/domain/template/fields';

export const SelectBasic = (props: z.infer<typeof SelectBasicFieldSchema>) => {
  return null;
};
SelectBasic.displayName = 'SelectBasic ';
