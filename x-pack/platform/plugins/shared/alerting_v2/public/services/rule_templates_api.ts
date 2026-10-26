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
  CreateRuleData,
  FindRuleTemplatesRequest,
  FindRuleTemplatesResponse,
  PutRuleData,
  RuleResponse,
  RuleTemplateResponse,
  RuleTemplateTagsParams,
  RuleTemplateTagsResponse,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH } from '../constants';

const buildRuleTemplatePath = (id: string): string =>
  buildPath(`${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/{id}`, { id });

const buildInstallRuleTemplatePath = (id: string): string =>
  buildPath(`${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/{id}/_install`, { id });

const buildUpsertInstallRuleTemplatePath = (id: string, ruleId: string): string =>
  buildPath(`${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/{id}/_install/{ruleId}`, {
    id,
    ruleId,
  });

@injectable()
export class RuleTemplatesApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async listRuleTemplates(params: FindRuleTemplatesRequest = {}) {
    return this.http.get<FindRuleTemplatesResponse>(ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH, {
      query: {
        page: params.page,
        per_page: params.per_page,
        search: params.search || undefined,
        tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
        excluded_tags:
          params.excluded_tags && params.excluded_tags.length > 0
            ? params.excluded_tags
            : undefined,
        sort_field: params.sort_field,
        sort_order: params.sort_order,
      },
    });
  }

  public async listTags(params: RuleTemplateTagsParams = {}): Promise<RuleTemplateTagsResponse> {
    return this.http.get<RuleTemplateTagsResponse>(
      `${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/tags`,
      {
        query: { search: params.search || undefined },
      }
    );
  }

  public async getRuleTemplate(id: string, signal?: AbortSignal) {
    return this.http.get<RuleTemplateResponse>(buildRuleTemplatePath(id), { signal });
  }

  /** Creates a rule from `payload` and records `id` as the template it came from. */
  public async installRuleTemplate(id: string, payload: CreateRuleData) {
    return this.http.post<RuleResponse>(buildInstallRuleTemplatePath(id), {
      body: JSON.stringify(payload),
    });
  }

  /**
   * Creates rule `ruleId` from `payload` attributed to template `id`, or replaces
   * it when it already exists.
   */
  public async upsertInstallRuleTemplate(id: string, ruleId: string, payload: PutRuleData) {
    return this.http.put<RuleResponse>(buildUpsertInstallRuleTemplatePath(id, ruleId), {
      body: JSON.stringify(payload),
    });
  }
}
