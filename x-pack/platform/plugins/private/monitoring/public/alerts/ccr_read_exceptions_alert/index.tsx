/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { validateDuration, ValidateDurationOptions } from '../../../common/validate_duration';
import {
  RULE_CCR_READ_EXCEPTIONS,
  RULE_DETAILS,
  RULE_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';
import type { MonitoringConfig } from '../../types';
import {
  LazyExpression,
  LazyExpressionProps,
} from '../components/param_details_form/lazy_expression';

export function createCCRReadExceptionsAlertType(
  config: MonitoringConfig
): RuleTypeModel<ValidateDurationOptions> {
  return {
    id: RULE_CCR_READ_EXCEPTIONS,
    description: RULE_DETAILS[RULE_CCR_READ_EXCEPTIONS].description,
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.monitoring.alertsKibanaCCRReadExceptions}`;
    },
    ruleParamsExpression: (props: LazyExpressionProps) => (
      <LazyExpression
        {...props}
        config={config}
        paramDetails={RULE_DETAILS[RULE_CCR_READ_EXCEPTIONS].paramDetails}
      />
    ),
    validate: validateDuration,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: RULE_REQUIRES_APP_CONTEXT,
  };
}
