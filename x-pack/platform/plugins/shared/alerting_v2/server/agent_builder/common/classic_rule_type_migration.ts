/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { AlertingServerStart, RuleTypeV2Migration } from '@kbn/alerting-plugin/server';

/**
 * Returns the alerting v2 migration a classic rule type registered, or `undefined` when the
 * rule type has none or is not registered.
 */
export type GetClassicRuleTypeMigration = (ruleTypeId: string) => RuleTypeV2Migration | undefined;

export const createGetClassicRuleTypeMigration =
  ({ getType }: Pick<AlertingServerStart, 'getType'>): GetClassicRuleTypeMigration =>
  (ruleTypeId) => {
    try {
      return getType(ruleTypeId).alertingV2Migration;
    } catch (error) {
      // `getType` rejects a rule type that is not registered with a 400.
      if (Boom.isBoom(error) && error.output.statusCode === 400) {
        return undefined;
      }
      throw error;
    }
  };
