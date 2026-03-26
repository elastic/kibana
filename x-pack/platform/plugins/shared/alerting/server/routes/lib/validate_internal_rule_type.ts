/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

interface ValidateRuleTypeParams {
  ruleTypeId: string;
  ruleTypes: Map<string, { internallyManaged?: boolean }>;
  operationText: string;
}

export const validateInternalRuleType = ({
  ruleTypeId,
  ruleTypes,
  operationText,
}: ValidateRuleTypeParams) => {
  const ruleType = ruleTypes.get(ruleTypeId);

  /**
   * Throws a bad request (400) if the rule type is internallyManaged
   * ruleType will always exist here because ruleTypes.get will throw a 400
   * error if the rule type is not registered.
   */
  if (ruleType?.internallyManaged) {
    throw Boom.badRequest(
      `Cannot ${operationText} rule of type "${ruleTypeId}" because it is internally managed.`
    );
  }
};
