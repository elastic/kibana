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
import type { FindRuleTemplatesResponse, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { buildSoSearch } from '../build_so_search';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../errors/error_codes';
import { getRuleTemplateNotFoundMessage } from '../errors/rule_template_error_messages';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { RuleTemplateSavedObjectsClientToken } from './tokens';
import type {
  FindRuleTemplatesArgs,
  GetRuleTemplateArgs,
  RuleTemplateSavedObjectAttributes,
} from './types';
import {
  buildFindRuleTemplatesFilter,
  mapSortField,
  RULE_TEMPLATE_SEARCH_FIELDS,
  transformRuleTemplateSoAttributesToApiResponse,
} from './utils';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

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
          code: ALERTING_LOG_CODES.RULE_TEMPLATE_VALIDATION_FAILED,
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
        code: ALERTING_LOG_CODES.RULE_TEMPLATE_VALIDATION_FAILED,
      });
      throw this.ruleTemplateNotFound(id);
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

  private ruleTemplateNotFound(id: string): Boom.Boom {
    return Boom.notFound(getRuleTemplateNotFoundMessage(id), {
      code: ALERTING_ERROR_CODES.RULE_TEMPLATE_NOT_FOUND,
      details: { rule_template_id: id },
    });
  }
}
