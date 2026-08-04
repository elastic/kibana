/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import { buildPath } from '@kbn/core-http-browser';
import type {
  FindRuleTemplatesRequest,
  FindRuleTemplatesResponse,
  RuleTemplateResponse,
  RuleTemplateTagsRequest,
  RuleTemplateTagsResponse,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH } from '../constants';

/**
 * Encodes the `id` path parameter safely. Wraps `buildPath` so a single call
 * site owns the template.
 */
const buildRuleTemplatePath = (id: string): string =>
  buildPath(`${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/{id}`, { id });

/** Re-exported from the shared schemas package. */
export type {
  FindRuleTemplatesRequest,
  FindRuleTemplatesResponse,
  RuleTemplateResponse,
  RuleTemplateTagsResponse,
};

@injectable()
export class RuleTemplatesApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async listRuleTemplates(params: FindRuleTemplatesRequest = {}, signal?: AbortSignal) {
    return this.http.get<FindRuleTemplatesResponse>(ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH, {
      query: params,
      signal,
    });
  }

  public async listTags(params: RuleTemplateTagsRequest = {}, signal?: AbortSignal) {
    return this.http.get<RuleTemplateTagsResponse>(
      `${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/_tags`,
      { query: params, signal }
    );
  }

  public async getRuleTemplate(id: string, signal?: AbortSignal) {
    return this.http.get<RuleTemplateResponse>(buildRuleTemplatePath(id), { signal });
  }
}
