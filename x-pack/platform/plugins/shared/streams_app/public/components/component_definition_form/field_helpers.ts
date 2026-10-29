/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueFieldDefinition } from '@kbn/streams-schema';

export const labelOf = (field: CatalogueFieldDefinition): string => field.label ?? field.name ?? '';

export const toControlId = (prefix: string, pointer: string): string =>
  `${prefix}${pointer.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
