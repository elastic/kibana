/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASES_LIST_TITLE = i18n.translate('xpack.cases.casesRedesign.list.title', {
  defaultMessage: 'Cases List (Redesign)',
});

export const CASE_DETAILS_TITLE = i18n.translate('xpack.cases.casesRedesign.details.title', {
  defaultMessage: 'Case Details (Redesign)',
});

export const CASE_SETTINGS_TITLE = i18n.translate('xpack.cases.casesRedesign.settings.title', {
  defaultMessage: 'Cases settings',
});

export const BACK_TO_CASES = i18n.translate('xpack.cases.casesRedesign.settings.backToCases', {
  defaultMessage: 'Cases',
});

export const VIEWING_CASE = (caseId: string) =>
  i18n.translate('xpack.cases.casesRedesign.details.viewingCase', {
    defaultMessage: 'Viewing case: {caseId}. This page is under construction.',
    values: { caseId },
  });

export const SHOW_METRICS = i18n.translate('xpack.cases.casesRedesign.details.showMetrics', {
  defaultMessage: 'Show metrics',
});

export const TEMPLATE_NOT_FOUND = (name: string) =>
  i18n.translate('xpack.cases.casesRedesign.details.templateNotFound', {
    defaultMessage: '{name} (not found)',
    values: { name },
  });

export const TEMPLATE_NOT_FOUND_GENERIC = i18n.translate(
  'xpack.cases.casesRedesign.details.templateNotFoundGeneric',
  {
    defaultMessage: 'Template not found',
  }
);

export const REPORTED_BY = (name: string) =>
  i18n.translate('xpack.cases.casesRedesign.details.reportedBy', {
    defaultMessage: 'Reported by: {name}',
    values: { name },
  });

export const CREATED_ON = (date: string) =>
  i18n.translate('xpack.cases.casesRedesign.details.createdOn', {
    defaultMessage: 'on: {date}',
    values: { date },
  });

export const UNKNOWN_REPORTER = i18n.translate(
  'xpack.cases.casesRedesign.details.unknownReporter',
  {
    defaultMessage: 'Unknown',
  }
);

export const EDIT_CASE_NAME_ARIA = i18n.translate(
  'xpack.cases.casesRedesign.details.editCaseNameAria',
  {
    defaultMessage: 'Edit case name',
  }
);

export const SHOW_FIELDS = i18n.translate('xpack.cases.casesRedesign.details.showFields', {
  defaultMessage: 'Show fields',
});

export const HIDE_FIELDS = i18n.translate('xpack.cases.casesRedesign.details.hideFields', {
  defaultMessage: 'Hide fields',
});

export const ATTRIBUTES_TITLE = i18n.translate(
  'xpack.cases.casesRedesign.details.attributesTitle',
  {
    defaultMessage: 'Attributes',
  }
);

export const TEMPLATE_FIELDS_TITLE = i18n.translate(
  'xpack.cases.casesRedesign.details.templateFieldsTitle',
  {
    defaultMessage: 'Template fields',
  }
);

export const NO_TEMPLATE_SELECTED = i18n.translate(
  'xpack.cases.casesRedesign.details.noTemplateSelected',
  {
    defaultMessage: 'No template selected',
  }
);

export const CHANGE_TEMPLATE_MODAL_TITLE = i18n.translate(
  'xpack.cases.casesRedesign.details.changeTemplateModalTitle',
  {
    defaultMessage: 'Change template',
  }
);

export const CHANGE_TEMPLATE_MODAL_CHANGE_BUTTON = i18n.translate(
  'xpack.cases.casesRedesign.details.changeTemplateModalChangeButtonLabel',
  {
    defaultMessage: 'Change',
  }
);

export const CHANGE_TEMPLATE_MODAL_APPLY_BUTTON = i18n.translate(
  'xpack.cases.casesRedesign.details.changeTemplateModalApplyButtonLabel',
  {
    defaultMessage: 'Apply',
  }
);

export const CHANGE_TEMPLATE_MODAL_REMOVE_BUTTON = i18n.translate(
  'xpack.cases.casesRedesign.details.changeTemplateModalRemoveButtonLabel',
  {
    defaultMessage: 'Remove',
  }
);

export const TEMPLATE_FIELDS_TOOLTIP_ARIA = (templateName: string) =>
  i18n.translate('xpack.cases.casesRedesign.details.templateFieldsTooltipAriaLabel', {
    defaultMessage: 'View fields included in the {templateName} template',
    values: { templateName },
  });

export const CONNECTORS_TITLE = i18n.translate(
  'xpack.cases.casesRedesign.details.connectorsTitle',
  {
    defaultMessage: 'Connectors',
  }
);

export const SECTION_SETTINGS_ARIA = i18n.translate(
  'xpack.cases.casesRedesign.details.sectionSettingsAria',
  {
    defaultMessage: 'Section settings',
  }
);

export const ASSIGNED_TITLE = i18n.translate('xpack.cases.casesRedesign.details.assignedTitle', {
  defaultMessage: 'Assigned',
});

export const PARTICIPANTS_TITLE = i18n.translate(
  'xpack.cases.casesRedesign.details.participantsTitle',
  {
    defaultMessage: 'Participants',
  }
);

export const CLICK_TO_SEND_EMAIL = (email: string) =>
  i18n.translate('xpack.cases.casesRedesign.details.clickToSendEmail', {
    defaultMessage: 'Click to send email to {email}',
    values: { email },
  });

export const ADD_CONNECTOR = i18n.translate('xpack.cases.casesRedesign.details.addConnector', {
  defaultMessage: 'Add connector',
});

export const LEGACY_CUSTOM_FIELDS_TITLE = i18n.translate(
  'xpack.cases.casesRedesign.details.legacyCustomFieldsTitle',
  {
    defaultMessage: 'Legacy custom fields',
  }
);
