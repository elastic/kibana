/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { getDescriptionFields as genericGetDescriptionFields } from './get_description_fields';
import {
  RULE_ELASTICSEARCH_VERSION_MISMATCH,
  RULE_KIBANA_VERSION_MISMATCH,
  RULE_LICENSE_EXPIRATION,
  RULE_LOGSTASH_VERSION_MISMATCH,
  RULE_NODES_CHANGED,
  RULE_THREAD_POOL_SEARCH_REJECTIONS,
  RULE_THREAD_POOL_WRITE_REJECTIONS,
} from '../../../common/constants';
import {
  LEGACY_RULES,
  LEGACY_RULE_DETAILS,
  RULE_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';
import type { MonitoringConfig } from '../../types';
import type { LazyExpressionProps } from './lazy_expression';
import { LazyExpression } from './lazy_expression';

const DEFAULT_VALIDATE = () => ({ errors: {} });

const RULES_WITH_DESCRIPTION_FIELDS = [
  RULE_NODES_CHANGED,
  RULE_LICENSE_EXPIRATION,
  RULE_KIBANA_VERSION_MISMATCH,
  RULE_ELASTICSEARCH_VERSION_MISMATCH,
  RULE_LOGSTASH_VERSION_MISMATCH,
  RULE_THREAD_POOL_SEARCH_REJECTIONS,
  RULE_THREAD_POOL_WRITE_REJECTIONS,
];

export function createLegacyAlertTypes(config: MonitoringConfig): RuleTypeModel[] {
  return LEGACY_RULES.map((legacyAlert) => {
    const validate = LEGACY_RULE_DETAILS[legacyAlert].validate ?? DEFAULT_VALIDATE;
    const getDescriptionFields = RULES_WITH_DESCRIPTION_FIELDS.includes(legacyAlert)
      ? genericGetDescriptionFields
      : undefined;
    return {
      id: legacyAlert,
      description: LEGACY_RULE_DETAILS[legacyAlert].description,
      iconClass: 'bell',
      documentationUrl(docLinks) {
        return `${docLinks.links.monitoring.alertsKibanaClusterAlerts}`;
      },
      ruleParamsExpression: (props: LazyExpressionProps) => (
        <LazyExpression
          {...props}
          defaults={LEGACY_RULE_DETAILS[legacyAlert].defaults}
          expressionConfig={LEGACY_RULE_DETAILS[legacyAlert].expressionConfig}
          config={config}
        />
      ),
      defaultActionMessage: '{{context.internalFullMessage}}',
      validate,
      requiresAppContext: RULE_REQUIRES_APP_CONTEXT,
      getDescriptionFields,
    };
  });
}
