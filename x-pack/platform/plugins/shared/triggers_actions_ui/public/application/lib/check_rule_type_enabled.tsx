/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash';
import { i18n } from '@kbn/i18n';
import { RuleType } from '../../types';

export interface IsEnabledResult {
  isEnabled: true;
}
export interface IsDisabledResult {
  isEnabled: false;
  message: string;
}

const getLicenseCheckResult = (ruleType: RuleType) => {
  return {
    isEnabled: false,
    message: i18n.translate(
      'xpack.triggersActionsUI.checkRuleTypeEnabled.ruleTypeDisabledByLicenseMessage',
      {
        defaultMessage: 'This rule type requires a {minimumLicenseRequired} license.',
        values: {
          minimumLicenseRequired: upperFirst(ruleType.minimumLicenseRequired),
        },
      }
    ),
  };
};

export function checkRuleTypeEnabled(ruleType?: RuleType): IsEnabledResult | IsDisabledResult {
  if (ruleType?.enabledInLicense === false) {
    return getLicenseCheckResult(ruleType);
  }

  return { isEnabled: true };
}
