/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import type { SavedObjectsGetOptions } from '@kbn/core-saved-objects-api-server';
import {
  assertAlertingV1RawRuleTemplate,
  type AlertingV1RawRuleTemplate,
  type RawRuleTemplate,
} from '../../../saved_objects/schemas/raw_rule_template';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../saved_objects';

export interface GetRuleTemplateSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  id: string;
  savedObjectsGetOptions?: SavedObjectsGetOptions;
}

/**
 * Gets a Fleet / alerting v1 rule template. Throws if the document uses the
 * alerting-v2 attribute shape.
 */
export const getRuleTemplateSo = async (
  params: GetRuleTemplateSoParams
): Promise<SavedObject<AlertingV1RawRuleTemplate>> => {
  const { savedObjectsClient, id, savedObjectsGetOptions } = params;

  const result = await savedObjectsClient.get<RawRuleTemplate>(
    RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    id,
    savedObjectsGetOptions
  );

  try {
    return {
      ...result,
      attributes: assertAlertingV1RawRuleTemplate(result.attributes, id),
    };
  } catch (error) {
    throw Boom.badRequest(error instanceof Error ? error.message : String(error));
  }
};
