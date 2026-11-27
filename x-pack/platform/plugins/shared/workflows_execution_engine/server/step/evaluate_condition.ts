/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KQLSyntaxError } from '@kbn/es-query';
import { decodeKqlTemplateValues, evaluateKql, parseKqlTemplate } from '@kbn/eval-kql';

export const evaluateCondition = (
  renderedCondition: string | boolean | undefined,
  context: Record<string, unknown>,
  stepId: string
): boolean => {
  if (typeof renderedCondition === 'boolean') {
    return renderedCondition;
  }
  if (typeof renderedCondition === 'undefined') {
    return false;
  }

  if (typeof renderedCondition === 'string') {
    try {
      return evaluateKql(parseKqlTemplate(renderedCondition), context);
    } catch (error) {
      if (error instanceof KQLSyntaxError) {
        throw new Error(
          `Syntax error in condition "${decodeKqlTemplateValues(
            renderedCondition
          )}" for step ${stepId}: ${decodeKqlTemplateValues(String(error))}`
        );
      }
      throw error;
    }
  }

  throw new Error(
    `Invalid condition type for step ${stepId}. ` +
      `Got ${JSON.stringify(renderedCondition)} (type: ${typeof renderedCondition}), ` +
      `but expected boolean or string (KQL expression).`
  );
};
