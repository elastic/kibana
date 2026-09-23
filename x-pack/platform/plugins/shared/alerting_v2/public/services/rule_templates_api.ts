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
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH } from '../constants';

const buildRuleTemplatePath = (id: string): string =>
  buildPath(`${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/{id}`, { id });

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
        sort_field: params.sort_field,
        sort_order: params.sort_order,
      },
    });
  }

  public async getRuleTemplate(id: string, signal?: AbortSignal) {
    return this.http.get<RuleTemplateResponse>(buildRuleTemplatePath(id), { signal });
  }
}
