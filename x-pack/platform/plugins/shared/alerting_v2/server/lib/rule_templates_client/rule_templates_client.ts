/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ruleTemplateDataSchema, type RuleTemplateData } from '@kbn/alerting-v2-schemas';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { treeifyError } from '@kbn/zod/v4';
import {
  RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  type RuleTemplateSavedObjectAttributes,
} from '../../saved_objects';
import { ALERTING_V2_ERROR_CODES } from '../errors/error_codes';

export interface CreateRuleTemplateParams {
  attributes: unknown;
  id?: string;
}

export interface RuleTemplateResponse {
  id: string;
  attributes: RuleTemplateData;
  version?: string;
}

/**
 * Minimal create/get client for `alerting_v2_rule_template` saved objects.
 * Zod owns create-rule validation; the SO create schema keeps `rule` opaque.
 */
export class RuleTemplatesClient {
  constructor(private readonly savedObjectsClient: SavedObjectsClientContract) {}

  public async create(params: CreateRuleTemplateParams): Promise<RuleTemplateResponse> {
    const parsed = ruleTemplateDataSchema.safeParse(params.attributes);
    if (!parsed.success) {
      throw Boom.badRequest(`Invalid rule template data: ${stringifyZodError(parsed.error)}`, {
        code: ALERTING_V2_ERROR_CODES.INVALID_RULE_DATA,
        details: { errors: treeifyError(parsed.error) },
      });
    }

    const attributes: RuleTemplateSavedObjectAttributes = {
      engine: parsed.data.engine,
      rule: parsed.data.rule,
    };

    try {
      const created = await this.savedObjectsClient.create<RuleTemplateSavedObjectAttributes>(
        RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes,
        params.id !== undefined ? { id: params.id } : undefined
      );

      return {
        id: created.id,
        attributes: parsed.data,
        version: created.version,
      };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        const conflictId = params.id ?? 'unknown';
        throw Boom.conflict(`Rule template "${conflictId}" already exists`, {
          code: ALERTING_V2_ERROR_CODES.RULE_ALREADY_EXISTS,
          details: { rule_template_id: conflictId },
        });
      }
      throw e;
    }
  }

  public async get(id: string): Promise<RuleTemplateResponse> {
    try {
      const doc = await this.savedObjectsClient.get<RuleTemplateSavedObjectAttributes>(
        RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        id
      );

      const parsed = ruleTemplateDataSchema.safeParse(doc.attributes);
      if (!parsed.success) {
        throw Boom.badData(
          `Stored rule template "${id}" failed schema validation: ${stringifyZodError(
            parsed.error
          )}`,
          {
            code: ALERTING_V2_ERROR_CODES.INVALID_RULE_DATA,
            details: { rule_template_id: id, errors: treeifyError(parsed.error) },
          }
        );
      }

      return {
        id: doc.id,
        attributes: parsed.data,
        version: doc.version,
      };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule template "${id}" not found`, {
          code: ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND,
          details: { rule_template_id: id },
        });
      }
      throw e;
    }
  }
}
