/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const STACK_BY_LABEL = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.stackByLabel',
  {
    defaultMessage: 'Stack by',
  }
);

export const STACK_BY_RISK_SCORES = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.riskScoresDropDown',
  {
    defaultMessage: 'Risk Scores',
  }
);

export const STACK_BY_SEVERITIES = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.severitiesDropDown',
  {
    defaultMessage: 'Severities',
  }
);

export const STACK_BY_DESTINATION_IPS = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.destinationIpsDropDown',
  {
    defaultMessage: 'Destination IPs',
  }
);

export const STACK_BY_SOURCE_IPS = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.sourceIpsDropDown',
  {
    defaultMessage: 'Source IPs',
  }
);

export const STACK_BY_ACTIONS = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.eventActionsDropDown',
  {
    defaultMessage: 'Event Actions',
  }
);

export const STACK_BY_CATEGORIES = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.eventCategoriesDropDown',
  {
    defaultMessage: 'Event Categories',
  }
);

export const STACK_BY_HOST_NAMES = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.hostNamesDropDown',
  {
    defaultMessage: 'Host Names',
  }
);

export const STACK_BY_RULE_TYPES = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.ruleTypesDropDown',
  {
    defaultMessage: 'Rule Types',
  }
);

export const STACK_BY_RULE_NAMES = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.rulesDropDown',
  {
    defaultMessage: 'Rules',
  }
);

export const STACK_BY_USERS = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.stackByOptions.usersDropDown',
  {
    defaultMessage: 'Users',
  }
);

export const HISTOGRAM_HEADER = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.headerTitle',
  {
    defaultMessage: 'Signal detection frequency',
  }
);

export const ALL_OTHERS = i18n.translate(
  'xpack.siem.detectionEngine.signals.histogram.allOthersGroupingLabel',
  {
    defaultMessage: 'All others',
  }
);
