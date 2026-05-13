/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { UntypedRuleTypeAlerts } from '../../types';

interface ShouldCreateAlertsInAllSpacesOpts {
  ruleTypeId: string;
  ruleTypeAlertDef?: UntypedRuleTypeAlerts;
  logger: Logger;
}
export const shouldCreateAlertsInAllSpaces = ({
  ruleTypeId,
  ruleTypeAlertDef,
  logger,
}: ShouldCreateAlertsInAllSpacesOpts): boolean => {
  const dangerouslyCreateAlertsInAllSpaces = ruleTypeAlertDef?.dangerouslyCreateAlertsInAllSpaces;
  const isSpaceAware = ruleTypeAlertDef?.isSpaceAware;

  if (dangerouslyCreateAlertsInAllSpaces === true) {
    if (isSpaceAware === true) {
      logger.warn(
        `Rule type "${ruleTypeId}" is space aware but also has "dangerouslyCreateAlertsInAllSpaces" set to true. This is not supported so alerts will be created with the space ID of the rule.`
      );
      return false;
    } else {
      // alerts will be created for all spaces
      return true;
    }
  }

  return false;
};
