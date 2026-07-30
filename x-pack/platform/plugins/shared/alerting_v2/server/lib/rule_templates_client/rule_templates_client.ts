/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import { inject, injectable } from 'inversify';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { buildSoSearch } from '../build_so_search';
import { RuleTemplateSavedObjectsClientToken } from './tokens';
import type {
  FindRuleTemplatesParams,
  FindRuleTemplatesResponse,
  RuleTemplateSavedObjectAttributes,
} from './types';
import { transformRuleTemplateSoAttributesToApiResponse } from './utils';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

const TEMPLATE_SEARCH_FIELDS = ['metadata.name', 'metadata.description'];

@injectable()
export class RuleTemplatesClient {
  constructor(
    @inject(RuleTemplateSavedObjectsClientToken)
    private readonly savedObjectsClient: SavedObjectsClientContract
  ) {}

  public async findRuleTemplates(
    params: FindRuleTemplatesParams = {}
  ): Promise<FindRuleTemplatesResponse> {
    const page = params.page ?? DEFAULT_PAGE;
    const perPage = params.perPage ?? DEFAULT_PER_PAGE;
    const filter = this.buildFindFilter(params);
    const sortField = this.mapSortField(params.sortField);
    const search = buildSoSearch(params.search);

    const res = await this.savedObjectsClient.find<RuleTemplateSavedObjectAttributes>({
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      page,
      perPage,
      filter,
      sortField,
      sortOrder: params.sortOrder,
      ...(search
        ? {
            search,
            searchFields: TEMPLATE_SEARCH_FIELDS,
            defaultSearchOperator: 'AND' as const,
          }
        : {}),
    });

    return {
      items: res.saved_objects.map((so) =>
        transformRuleTemplateSoAttributesToApiResponse(so.id, so.attributes)
      ),
      total: res.total,
      page,
      perPage,
    };
  }

  /**
   * Always restricts results to engine:v2 templates. Optionally AND's tags
   * filters from the request.
   */
  private buildFindFilter(params: FindRuleTemplatesParams): KueryNode {
    const attrPrefix = `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes`;
    const conditions: KueryNode[] = [nodeBuilder.is(`${attrPrefix}.engine`, 'v2')];

    if (params.tags && params.tags.length > 0) {
      const tagConditions = params.tags.map((tag) =>
        nodeBuilder.is(`${attrPrefix}.metadata.tags`, tag)
      );
      conditions.push(
        tagConditions.length === 1 ? tagConditions[0] : nodeBuilder.or(tagConditions)
      );
    }

    return conditions.length === 1 ? conditions[0] : nodeBuilder.and(conditions);
  }

  private mapSortField(sortField?: FindRuleTemplatesParams['sortField']): string | undefined {
    if (!sortField) {
      return 'metadata.name.keyword';
    }

    const sortFieldMap: Record<NonNullable<FindRuleTemplatesParams['sortField']>, string> = {
      name: 'metadata.name.keyword',
      tags: 'metadata.tags',
    };

    return sortFieldMap[sortField];
  }
}
