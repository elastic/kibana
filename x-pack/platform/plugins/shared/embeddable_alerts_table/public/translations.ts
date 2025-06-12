/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SWITCH_SOLUTION_CONFIRM_MESSAGE = i18n.translate(
  'xpack.embeddableAlertsTable.configEditorFlyout.switchSolutionConfirmMessage',
  {
    defaultMessage:
      'Switching solutions will reset the filters. Are you sure you want to continue?',
  }
);

export const SWITCH_SOLUTION_CONFIRM_TITLE = i18n.translate(
  'xpack.embeddableAlertsTable.configEditorFlyout.switchSolutionConfirmTitle',
  {
    defaultMessage: 'Switch solution',
  }
);

export const SWITCH_SOLUTION_CONFIRM_CANCEL_MESSAGE = i18n.translate(
  'xpack.embeddableAlertsTable.configEditorFlyout.switchSolutionConfirmCancelMessage',
  {
    defaultMessage: 'Keep the current solution',
  }
);

export const SWITCH_SOLUTION_CONFIRM_CONFIRM_MESSAGE = i18n.translate(
  'xpack.embeddableAlertsTable.configEditorFlyout.switchSolutionConfirmConfirmMessage',
  {
    defaultMessage: 'Switch solution',
  }
);

export const CONFIG_EDITOR_CLEAR_FILTERS_LABEL = i18n.translate(
  'xpack.embeddableAlertsTable.configEditorFlyout.clearFiltersLabel',
  {
    defaultMessage: 'Clear all',
  }
);

export const CONFIG_EDITOR_PANEL_DESCRIPTION = i18n.translate(
  'xpack.embeddableAlertsTable.configEditorFlyout.panelDescription',
  {
    defaultMessage:
      'This panel will display a list of your alerts. You can filter by rule types or tags.',
  }
);

export const RULE_TYPES_LOAD_ERROR_TITLE = i18n.translate(
  'xpack.embeddableAlertsTable.ruleTypesLoadErrorTitle',
  {
    defaultMessage: 'Cannot load rule types',
  }
);

export const RULE_TYPES_LOAD_ERROR_DESCRIPTION = i18n.translate(
  'xpack.embeddableAlertsTable.ruleTypesLoadErrorDescription',
  {
    defaultMessage: 'Rule types are required to display the alerts panel.',
  }
);

export const ADD_ALERTS_TABLE_ACTION_LABEL = i18n.translate(
  'xpack.embeddableAlertsTable.actionLabel',
  {
    defaultMessage: 'Alerts',
  }
);

export const ALERTS_PANEL_LABEL = i18n.translate('xpack.embeddableAlertsTable.alertsPanelLabel', {
  defaultMessage: 'alerts panel',
});

export const CONFIG_EDITOR_ADD_TABLE_TITLE = i18n.translate(
  'xpack.embeddableAlertsTable.configEditor.addTabletitle',
  {
    defaultMessage: 'Add alerts panel',
  }
);

export const CONFIG_EDITOR_EDIT_TABLE_TITLE = i18n.translate(
  'xpack.embeddableAlertsTable.configEditor.editTabletitle',
  {
    defaultMessage: 'Edit alerts panel',
  }
);

export const CONFIG_EDITOR_FILTERS_FORM_TITLE = i18n.translate(
  'xpack.embeddableAlertsTable.configEditor.filtersFormTitle',
  {
    defaultMessage: 'Filters',
  }
);

export const CONFIG_EDITOR_CANNOT_LOAD_RULE_TYPES_TITLE = i18n.translate(
  'xpack.embeddableAlertsTable.configEditor.cannotLoadRuleTypesTitle',
  {
    defaultMessage: 'Cannot load rule types',
  }
);

export const CONFIG_EDITOR_CANNOT_LOAD_RULE_TYPES_DESCRIPTION = i18n.translate(
  'xpack.embeddableAlertsTable.configEditor.cannotLoadRuleTypesDescription',
  {
    defaultMessage: 'Editing filters without rule types is not possible.',
  }
);

export const CONFIG_EDITOR_EDITOR_CLOSE_LABEL = i18n.translate(
  'xpack.embeddableAlertsTable.configEditor.editorCloseLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const CONFIG_EDITOR_EDITOR_SAVE_LABEL = i18n.translate(
  'xpack.embeddableAlertsTable.configEditor.editorSaveLabel',
  {
    defaultMessage: 'Save',
  }
);

export const CONFIG_EDITOR_KQL_ERROR_TOAST_TITLE = i18n.translate(
  'alertsFiltersForm.configEditor.kqlConverstionErrorToastTitle',
  {
    defaultMessage: 'Cannot apply alerts panel filters',
  }
);

export const NO_AUTHORIZED_RULE_TYPE_PROMPT_TITLE = i18n.translate(
  'xpack.embeddableAlertsTable.noAuthorizedRuleTypePromptTitle',
  {
    defaultMessage: 'Missing alerting authorizations',
  }
);

export const getSolutionRuleTypesAuthPromptBody = (solution: string) =>
  i18n.translate('xpack.embeddableAlertsTable.noAuthorizedRuleTypePromptBody', {
    defaultMessage:
      'Cannot display this panel without access to {solution} alerting rules. Contact your system administrator for more information.',
    values: { solution },
  });
