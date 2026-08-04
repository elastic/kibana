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
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { buildSoSearch } from '../build_so_search';
import { escapeRegex } from '../escape_regex';
import { ALERTING_V2_ERROR_CODES, ALERTING_V2_LOG_CODES } from '../errors/error_codes';
import { getRuleTemplateNotFoundMessage } from '../errors/rule_template_error_messages';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { RuleTemplateSavedObjectsClientToken } from './tokens';
import type {
  FindRuleTemplatesArgs,
  FindRuleTemplatesResponse,
  GetRuleTemplateArgs,
  GetRuleTemplateTagsArgs,
  RuleTemplateResponse,
  RuleTemplateSavedObjectAttributes,
} from './types';
import {
  buildEngineV2Filter,
  buildFindRuleTemplatesFilter,
  mapSortField,
  RULE_TEMPLATE_SEARCH_FIELDS,
  RULE_TEMPLATE_TAGS_FIELD,
  transformRuleTemplateSoAttributesToApiResponse,
} from './utils';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

/**
 * Upper bound on the number of distinct tags the aggregation returns. Matches
 * the rules tag aggregation so both filter UIs behave the same.
 */
const TAGS_AGG_SIZE = 10000;

interface TagsAggregationResult {
  tags: { buckets: Array<{ key: string }> };
}

/**
 * Read-only access to the alerting v2 rule templates installed by Fleet
 * packages. Templates are never written through this API — the library UI reads
 * them and hands the embedded `rule` payload to the create rule API.
 */
@injectable()
export class RuleTemplatesClient {
  constructor(
    @inject(RuleTemplateSavedObjectsClientToken)
    private readonly savedObjectsClient: SavedObjectsClientContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

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
      filter: buildFindRuleTemplatesFilter(params.tags),
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
      try {
        return [transformRuleTemplateSoAttributesToApiResponse(so.id, so.attributes)];
      } catch (e) {
        // Fleet validates templates at install time, so a parse failure here
        // means stored content drifted from the schema. Drop the offending
        // template rather than failing the whole page, and log so the bad
        // content is discoverable.
        this.logger.error({
          error: e instanceof Error ? e : new Error(String(e)),
          code: ALERTING_V2_LOG_CODES.RULE_TEMPLATE_VALIDATION_FAILED,
        });
        return [];
      }
    });

    return {
      items,
      // `total` counts what Elasticsearch matched, so it can exceed
      // `items.length` when a template on this page failed to parse.
      total: res.total,
      page,
      perPage,
    };
  }

  public async getRuleTemplate({ id }: GetRuleTemplateArgs): Promise<RuleTemplateResponse> {
    const so = await this.getRuleTemplateSo(id);

    try {
      return transformRuleTemplateSoAttributesToApiResponse(so.id, so.attributes);
    } catch (e) {
      // The saved object exists but is not usable by the v2 engine — either it
      // belongs to alerting v1 or its payload drifted from the schema. Both are
      // "no such v2 template" as far as this API is concerned.
      this.logger.error({
        error: e instanceof Error ? e : new Error(String(e)),
        code: ALERTING_V2_LOG_CODES.RULE_TEMPLATE_VALIDATION_FAILED,
      });
      throw this.ruleTemplateNotFound(id);
    }
  }

  public async getTags({ search }: GetRuleTemplateTagsArgs = {}): Promise<string[]> {
    const res = await this.savedObjectsClient.find<
      RuleTemplateSavedObjectAttributes,
      TagsAggregationResult
    >({
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      perPage: 0,
      filter: buildEngineV2Filter(),
      aggs: {
        tags: {
          terms: {
            field: RULE_TEMPLATE_TAGS_FIELD,
            size: TAGS_AGG_SIZE,
            order: { _key: 'asc' as const },
            // `include` is a Lucene regex anchored on the whole term, so the
            // trailing `.*` turns the caller's search into a prefix match.
            ...(search ? { include: `${escapeRegex(search)}.*` } : {}),
          },
        },
      },
    });

    return (
      res.aggregations?.tags.buckets.map(({ key }) => key).filter((key) => key.length > 0) ?? []
    );
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

  private ruleTemplateNotFound(id: string): Boom.Boom {
    return Boom.notFound(getRuleTemplateNotFoundMessage(id), {
      code: ALERTING_V2_ERROR_CODES.RULE_TEMPLATE_NOT_FOUND,
      details: { rule_template_id: id },
    });
  }
}
