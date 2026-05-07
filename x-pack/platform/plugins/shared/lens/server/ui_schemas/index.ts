/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UISchemaEntry } from './types';
import { datatableUISchema } from './datatable';

export type { UISchemaEntry } from './types';
export type { FieldDescriptor } from './types';

/**
 * Registry mapping visualization IDs to their UI schemas.
 */
export const uiSchemaRegistry: Record<string, UISchemaEntry[]> = {
  lnsDatatable: datatableUISchema,
};
