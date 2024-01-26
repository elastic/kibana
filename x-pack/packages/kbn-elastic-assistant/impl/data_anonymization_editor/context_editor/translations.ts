/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALL_ACTIONS = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.allActionsTooltip',
  {
    defaultMessage: 'All actions',
  }
);

export const ALLOW = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.allowAction',
  {
    defaultMessage: 'Allow',
  }
);

export const ALLOW_BY_DEFAULT = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.allowByDefaultAction',
  {
    defaultMessage: 'Allow by default',
  }
);

export const ALLOWED = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.allowedColumnTitle',
  {
    defaultMessage: 'Allowed',
  }
);

export const ALWAYS = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.alwaysSubmenu',
  {
    defaultMessage: 'Always',
  }
);

export const ANONYMIZE = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.anonymizeAction',
  {
    defaultMessage: 'Anonymize',
  }
);

export const ANONYMIZE_BY_DEFAULT = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.anonymizeByDefaultAction',
  {
    defaultMessage: 'Anonymize by default',
  }
);

export const ANONYMIZED = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.anonymizedColumnTitle',
  {
    defaultMessage: 'Anonymized',
  }
);

export const BULK_ACTIONS = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.bulkActions',
  {
    defaultMessage: 'Bulk actions',
  }
);

export const DEFAULTS = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.defaultsSubmenu',
  {
    defaultMessage: 'Defaults',
  }
);

export const DENY = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.denyAction',
  {
    defaultMessage: 'Deny',
  }
);

export const DENY_BY_DEFAULT = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.denyByDefaultAction',
  {
    defaultMessage: 'Deny by default',
  }
);

export const FIELD = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.fieldColumnTitle',
  {
    defaultMessage: 'Field',
  }
);

export const NO = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.noButtonLabel',
  {
    defaultMessage: 'No',
  }
);

export const SELECT_ALL_FIELDS = (totalFields: number) =>
  i18n.translate('xpack.elasticAssistant.dataAnonymizationEditor.contextEditor.selectAllFields', {
    values: { totalFields },
    defaultMessage: 'Select all {totalFields} fields',
  });

export const SELECTED_FIELDS = (selected: number) =>
  i18n.translate('xpack.elasticAssistant.dataAnonymizationEditor.contextEditor.selectedFields', {
    values: { selected },
    defaultMessage: 'Selected {selected} fields',
  });
export const RESET = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.resetButton',
  {
    defaultMessage: 'Reset',
  }
);

export const UNANONYMIZE = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.unanonymizeAction',
  {
    defaultMessage: 'Unanonymize',
  }
);

export const UNANONYMIZE_BY_DEFAULT = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.unanonymizeByDefaultAction',
  {
    defaultMessage: 'Unanonymize by default',
  }
);

export const VALUES = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.valuesColumnTitle',
  {
    defaultMessage: 'Values',
  }
);

export const YES = i18n.translate(
  'xpack.elasticAssistant.assistant.dataAnonymizationEditor.contextEditor.yesButtonLabel',
  {
    defaultMessage: 'Yes',
  }
);
