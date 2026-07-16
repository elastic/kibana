/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { RulesClient } from '@kbn/alerting-plugin/server';

/**
 * Cleanup-only access to Alerting v1 rules retained for the time-boxed reset endpoint.
 * This must not be used to create, update, or read Significant Events at runtime.
 */
export const deleteLegacyRules = async (
  rulesClient: RulesClient,
  ruleIds: string[]
): Promise<void> => {
  for (const id of ruleIds) {
    try {
      await rulesClient.delete({ id });
    } catch (error) {
      if (isBoom(error) && error.output.statusCode === 404) {
        continue;
      }
      throw error;
    }
  }
};
