/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConversationListOptions {
  agentId?: string;
  filters?: ConversationSearchFilters;
}

export interface ConversationExtendedFieldFilter {
  key: string;
  value?: string;
  exists?: boolean;
}

export interface ConversationSearchFilters {
  template?: {
    id?: string;
    version?: number;
  };
  extendedFields?: ConversationExtendedFieldFilter[];
}
