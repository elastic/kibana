/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';

const ENTITY_TYPE_ICONS: Record<string, IconType> = {
  host: 'compute',
  user: 'user',
  service: 'gear',
  generic: 'node',
};

/** Icon for an Impact entity type; unknown types get a neutral node, absent types get none. */
export const entityTypeIcon = (entityType: string | undefined): IconType | undefined =>
  entityType ? (ENTITY_TYPE_ICONS[entityType.toLowerCase()] ?? 'node') : undefined;
