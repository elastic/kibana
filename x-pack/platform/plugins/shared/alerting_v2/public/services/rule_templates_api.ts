/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import type {
  FindRuleTemplatesParams,
  FindRuleTemplatesResponse,
  RuleTemplateResponse,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_INTERNAL_RULE_TEMPLATES_API_PATH } from '@kbn/alerting-v2-constants';

export type { FindRuleTemplatesParams, FindRuleTemplatesResponse, RuleTemplateResponse };

@injectable()
export class RuleTemplatesApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async findRuleTemplates(params: FindRuleTemplatesParams = {}) {
    return this.http.get<FindRuleTemplatesResponse>(ALERTING_V2_INTERNAL_RULE_TEMPLATES_API_PATH, {
      query: {
        page: params.page,
        perPage: params.perPage,
        search: params.search || undefined,
        sortField: params.sortField,
        sortOrder: params.sortOrder,
        tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
      },
    });
  }
}
