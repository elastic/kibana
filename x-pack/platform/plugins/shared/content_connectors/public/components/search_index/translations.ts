/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BASIC_TABLE_FIELD_TITLE = i18n.translate(
  'xpack.contentConnectors.index.connector.syncRules.basicTable.fieldTitle',
  { defaultMessage: 'Field' }
);

export const BASIC_TABLE_POLICY_TITLE = i18n.translate(
  'xpack.contentConnectors.index.connector.rule.basicTable.policyTitle',
  { defaultMessage: 'Policy' }
);

export const BASIC_TABLE_RULE_TITLE = i18n.translate(
  'xpack.contentConnectors.index.connector.syncRules.basicTable.ruleTitle',
  { defaultMessage: 'Rule' }
);

export const BASIC_TABLE_VALUE_TITLE = i18n.translate(
  'xpack.contentConnectors.index.connector.syncRules.basicTable.valueTitle',
  { defaultMessage: 'Value' }
);

export const getSyncRulesDescription = (indexName: string): string =>
  i18n.translate('xpack.contentConnectors.content.index.connector.syncRules.description', {
    defaultMessage:
      'Add a sync rule to customize what data is synchronized from {indexName}. Everything is included by default, and documents are validated against the configured set of sync rules in the listed order.',
    values: { indexName },
  });

export const SYNC_RULES_LEARN_MORE_LINK = i18n.translate(
  'xpack.contentConnectors.content.index.connector.syncRules.link',
  { defaultMessage: 'Learn more about customizing your sync rules.' }
);

export const SYNC_RULES_TABLE_ADD_RULE_LABEL = i18n.translate(
  'xpack.contentConnectors.content.index.connector.syncRules.table.addRuleLabel',
  { defaultMessage: 'Add sync rule' }
);

export const SYNC_RULES_TABLE_ARIA_LABEL = i18n.translate(
  'xpack.contentConnectors.content.index.connector.syncRules.table.ariaLabel',
  { defaultMessage: 'Sync rules' }
);

export const REGEX_ERROR = i18n.translate(
  'xpack.contentConnectors.content.index.connector.filteringRules.regExError',
  { defaultMessage: 'Value should be a regular expression' }
);

export const INCLUDE_EVERYTHING_ELSE_MESSAGE = i18n.translate(
  'xpack.contentConnectors.content.sources.basicRulesTable.includeEverythingMessage',
  { defaultMessage: 'Include everything else from this source' }
);
