/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import Mustache from 'mustache';
import { some } from 'lodash';
import type { ActionVariable, RuleActionParam } from '@kbn/alerting-types';

const publicUrlWarning = i18n.translate('responseOpsRuleForm.ruleForm.actionsForm.publicBaseUrl', {
  defaultMessage:
    'server.publicBaseUrl is not set. Generated URLs will be either relative or empty.',
});

export const validateParamsForWarnings = ({
  value,
  publicBaseUrl,
  actionVariables,
}: {
  value: RuleActionParam;
  publicBaseUrl?: string;
  actionVariables?: ActionVariable[];
}): string | null => {
  if (!publicBaseUrl && value && typeof value === 'string') {
    const publicUrlFields = (actionVariables || []).reduce((acc, v) => {
      if (v.usesPublicBaseUrl) {
        acc.push(v.name.replace(/^(params\.|context\.|state\.)/, ''));
        acc.push(v.name);
      }
      return acc;
    }, new Array<string>());

    try {
      const variables = new Set(
        Mustache.parse(value)
          .filter(([type]) => type === 'name')
          .map(([, v]) => v)
      );
      const hasUrlFields = some(publicUrlFields, (publicUrlField) => variables.has(publicUrlField));
      if (hasUrlFields) {
        return publicUrlWarning;
      }
    } catch (e) {
      // Better to set the warning msg if you do not know if the mustache template is invalid
      return publicUrlWarning;
    }
  }

  return null;
};
