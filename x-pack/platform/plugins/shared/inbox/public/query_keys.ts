/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InboxActionStatus } from '@kbn/inbox-common';

export interface InboxActionsListFilters {
  status?: InboxActionStatus;
  sourceApp?: string;
  page?: number;
  perPage?: number;
}

export const queryKeys = {
  actions: {
    all: ['inbox', 'actions'] as const,
    list: (filters?: InboxActionsListFilters) => ['inbox', 'actions', 'list', filters] as const,
  },
};
