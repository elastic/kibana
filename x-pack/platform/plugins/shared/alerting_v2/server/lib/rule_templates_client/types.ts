/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FindRuleTemplatesResponse,
  FindRuleTemplatesSortField,
  RuleTemplateData,
  RuleTemplateResponse,
} from '@kbn/alerting-v2-schemas';

/** Re-exported from the shared schemas package. */
export type {
  FindRuleTemplatesResponse,
  FindRuleTemplatesSortField,
  RuleTemplateData,
  RuleTemplateResponse,
};

/**
 * Stored attributes of an `engine: "v2"` rule template. Reads go through Zod
 * before they leave the client, so this is the expected — not guaranteed —
 * shape of the saved object.
 */
export type RuleTemplateSavedObjectAttributes = RuleTemplateData;

export interface FindRuleTemplatesArgs {
  page?: number;
  perPage?: number;
  search?: string;
  sortField?: FindRuleTemplatesSortField;
  sortOrder?: 'asc' | 'desc';
  tags?: string[];
}

export interface GetRuleTemplateArgs {
  id: string;
}

export interface GetRuleTemplateTagsArgs {
  search?: string;
}
