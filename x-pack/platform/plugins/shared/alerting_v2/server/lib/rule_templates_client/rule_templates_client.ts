/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { inject, injectable } from 'inversify';
import type {
  FindRuleTemplatesResponse,
  RuleResponse,
  RuleTemplateResponse,
  RuleTemplateTagsParams,
} from '@kbn/alerting-v2-schemas';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { buildSoSearch } from '../build_so_search';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../errors/error_codes';
import { getRuleTemplateNotFoundMessage } from '../errors/rule_template_error_messages';
import { RulesClient } from '../rules_client';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { RuleTemplateSavedObjectsClientToken } from './tokens';
import type {
  FindRuleTemplatesArgs,
  GetRuleTemplateArgs,
  InstallRuleTemplateArgs,
  RuleTemplateSavedObjectAttributes,
} from './types';
import {
  buildFindRuleTemplatesFilter,
  buildEngineV2Filter,
  buildRuleTemplateTagsAggregation,
  mapSortField,
  RULE_TEMPLATE_SEARCH_FIELDS,
  transformRuleTemplateSoAttributesToApiResponse,
} from './utils';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

/**
 * Access to the alerting v2 rule templates installed by Fleet packages.
 * Templates are never written through this API. The library UI reads them and
 * installs one by creating a rule from it, which records the template on the
 * new rule's `metadata.template`.
 */
@injectable()
export class RuleTemplatesClient {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(RuleTemplateSavedObjectsClientToken)
    private readonly savedObjectsClient: SavedObjectsClientContract,
    @inject(LoggerServiceToken) logger: LoggerServiceContract,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    this.logger = logger.forSubsystem('ruleTemplateClient');
  }

  public async findRuleTemplates(
    params: FindRuleTemplatesArgs = {}
  ): Promise<FindRuleTemplatesResponse> {
    const page = params.page ?? DEFAULT_PAGE;
    const perPage = params.perPage ?? DEFAULT_PER_PAGE;
    const search = buildSoSearch(params.search);

    const res = await this.savedObjectsClient.find<RuleTemplateSavedObjectAttributes>({
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      page,
      perPage,
      filter: buildFindRuleTemplatesFilter(params.tags, params.excludedTags),
      sortField: mapSortField(params.sortField),
      sortOrder: params.sortOrder ?? 'asc',
      ...(search
        ? {
            search,
            searchFields: RULE_TEMPLATE_SEARCH_FIELDS,
            defaultSearchOperator: 'AND' as const,
          }
        : {}),
    });

    const items = res.saved_objects.flatMap((so) => {
      const item = this.tryTransformRuleTemplate(so.id, so.attributes);
      return item ? [item] : [];
    });

    const ruleCounts = await this.tryGetRuleCounts(items.map(({ id }) => id));

    return {
      items: ruleCounts
        ? items.map((item) => ({ ...item, rule_count: ruleCounts[item.id] ?? 0 }))
        : items,
      total: res.total,
      page,
      per_page: perPage,
    };
  }

  public async getRuleTemplate({ id }: GetRuleTemplateArgs): Promise<RuleTemplateResponse> {
    const so = await this.getRuleTemplateSo(id);
    const item = this.tryTransformRuleTemplate(so.id, so.attributes);
    if (!item) {
      // Exists but unusable by the v2 engine (classic alerting template or
      // schema drift) — treat as not found.
      throw this.ruleTemplateNotFound(id);
    }
    return item;
  }

  /** Creates a rule from `data` and records the template it was installed from. */
  public async installRuleTemplate({ id, data }: InstallRuleTemplateArgs): Promise<RuleResponse> {
    // Fails with 404 when the template is missing or unusable, so a rule is
    // never attributed to a template that cannot be read back.
    await this.getRuleTemplate({ id });

    return this.rulesClient.createRule({ data, options: { template: { id } } });
  }

  public async getTags({ search }: RuleTemplateTagsParams = {}): Promise<string[]> {
    const result = await this.savedObjectsClient.find<RuleTemplateSavedObjectAttributes>({
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      perPage: 0,
      filter: buildEngineV2Filter(),
      aggs: buildRuleTemplateTagsAggregation(search),
    });

    const aggregations = result.aggregations as
      | { tags?: { buckets: Array<{ key: string }> } }
      | undefined;

    return aggregations?.tags?.buckets.map(({ key }) => key) ?? [];
  }

  /**
   * The count is supplementary, so a failure is logged and the templates are listed
   * without `rule_count` rather than failing the whole listing.
   */
  private async tryGetRuleCounts(templateIds: string[]): Promise<Record<string, number> | null> {
    try {
      return await this.rulesClient.getRuleCountsByTemplateId(templateIds);
    } catch (e) {
      this.logger.warn({
        message: 'Failed to count the rules created from each rule template',
        code: ALERTING_LOG_CODES.RULE_TEMPLATE_RULE_COUNT_FAILED,
        error: e,
      });
      return null;
    }
  }

  private async getRuleTemplateSo(id: string) {
    try {
      return await this.savedObjectsClient.get<RuleTemplateSavedObjectAttributes>(
        RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        id
      );
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw this.ruleTemplateNotFound(id);
      }
      throw e;
    }
  }

  /**
   * Transforms stored attributes into the API response. Returns null and logs
   * when validation fails so callers can omit the item (find) or map to 404 (get).
   */
  private tryTransformRuleTemplate(
    id: string,
    attributes: RuleTemplateSavedObjectAttributes
  ): RuleTemplateResponse | null {
    try {
      return transformRuleTemplateSoAttributesToApiResponse(id, attributes);
    } catch (e) {
      this.logger.warn({
        message: 'Rule template failed schema validation',
        code: ALERTING_LOG_CODES.RULE_TEMPLATE_VALIDATION_FAILED,
        labels: { rule_template_id: id },
        error: e,
      });
      return null;
    }
  }

  private ruleTemplateNotFound(id: string): Boom.Boom {
    return Boom.notFound(getRuleTemplateNotFoundMessage(id), {
      code: ALERTING_ERROR_CODES.RULE_TEMPLATE_NOT_FOUND,
      details: { rule_template_id: id },
    });
  }
}
