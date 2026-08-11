/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldRule } from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import {
  TARGET_TYPE_DATA_VIEW,
  TARGET_TYPE_INDEX,
  TARGET_TYPE_INDEX_PATTERN,
} from '../common/target_types';
import {
  FIELD_RULE_ACTION_ALLOW,
  FIELD_RULE_ACTION_ANONYMIZE,
  FIELD_RULE_ACTION_DENY,
  type FieldRuleAction,
} from './hooks/field_rule_actions';
import type { TargetType } from './types';

export const FIELD_PAGE_SIZE = 10;
export const TARGET_LOOKUP_DEBOUNCE_MS = 250;
export const TARGET_ID_OPTIONS_LIMIT = 100;

export const TARGET_TYPE_OPTIONS: Array<{ value: TargetType; text: string }> = [
  {
    value: TARGET_TYPE_INDEX,
    text: i18n.translate('anonymizationUi.profiles.targetTypeOption.index', {
      defaultMessage: 'index',
    }),
  },
  {
    value: TARGET_TYPE_INDEX_PATTERN,
    text: i18n.translate('anonymizationUi.profiles.targetTypeOption.indexPattern', {
      defaultMessage: 'index_pattern',
    }),
  },
  {
    value: TARGET_TYPE_DATA_VIEW,
    text: i18n.translate('anonymizationUi.profiles.targetTypeOption.dataView', {
      defaultMessage: 'data_view',
    }),
  },
];

export const TARGET_TYPE_FILTER_OPTIONS: Array<{ value: '' | TargetType; text: string }> = [
  {
    value: '',
    text: i18n.translate('anonymizationUi.profiles.targetTypeFilter.any', {
      defaultMessage: 'Any target type',
    }),
  },
  ...TARGET_TYPE_OPTIONS,
];

export const FIELD_ACTION_OPTIONS = [
  {
    value: 'all',
    text: i18n.translate('anonymizationUi.profiles.fieldAction.all', { defaultMessage: 'All' }),
  },
  {
    value: FIELD_RULE_ACTION_ALLOW,
    text: i18n.translate('anonymizationUi.profiles.fieldAction.allow', {
      defaultMessage: 'Allow',
    }),
  },
  {
    value: FIELD_RULE_ACTION_ANONYMIZE,
    text: i18n.translate('anonymizationUi.profiles.fieldAction.anonymize', {
      defaultMessage: 'Anonymize',
    }),
  },
  {
    value: FIELD_RULE_ACTION_DENY,
    text: i18n.translate('anonymizationUi.profiles.fieldAction.deny', { defaultMessage: 'Deny' }),
  },
] as const;

export const POLICY_ACTION_OPTIONS: Array<{ value: FieldRuleAction; text: string }> = [
  {
    value: FIELD_RULE_ACTION_ALLOW,
    text: i18n.translate('anonymizationUi.profiles.fieldPolicy.allow', {
      defaultMessage: 'Allow',
    }),
  },
  {
    value: FIELD_RULE_ACTION_ANONYMIZE,
    text: i18n.translate('anonymizationUi.profiles.fieldPolicy.anonymize', {
      defaultMessage: 'Anonymize',
    }),
  },
  {
    value: FIELD_RULE_ACTION_DENY,
    text: i18n.translate('anonymizationUi.profiles.fieldPolicy.deny', {
      defaultMessage: 'Deny',
    }),
  },
];

export const SAMPLE_PREVIEW_DOCUMENT: Record<string, unknown> = {
  host: { name: 'edge-1', ip: '10.1.1.14' },
  user: { name: 'alice' },
  event: { category: 'authentication' },
};

export const toFieldAction = (rule: FieldRule): FieldRuleAction => {
  if (!rule.allowed) {
    return FIELD_RULE_ACTION_DENY;
  }
  return rule.anonymized ? FIELD_RULE_ACTION_ANONYMIZE : FIELD_RULE_ACTION_ALLOW;
};

export const getFieldPolicyBehaviorLabel = (action: FieldRuleAction) => {
  if (action === FIELD_RULE_ACTION_ALLOW) {
    return i18n.translate('anonymizationUi.profiles.fieldPolicy.behavior.allow', {
      defaultMessage: 'Sent as-is',
    });
  }

  if (action === FIELD_RULE_ACTION_ANONYMIZE) {
    return i18n.translate('anonymizationUi.profiles.fieldPolicy.behavior.anonymize', {
      defaultMessage: 'Sent as token',
    });
  }

  return i18n.translate('anonymizationUi.profiles.fieldPolicy.behavior.deny', {
    defaultMessage: 'Not sent',
  });
};
