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

export const CUSTOM_FIELDS_SECTION_TITLE = i18n.translate(
  'xpack.cases.casesRedesign.details.customFieldsSectionTitle',
  {
    defaultMessage: 'Custom fields',
  }
);

export const NO_TEMPLATE_APPLIED = i18n.translate(
  'xpack.cases.casesRedesign.details.noTemplateApplied',
  {
    defaultMessage: 'No template applied',
  }
);

export const APPLY_TEMPLATE_TO_SEE_FIELDS = i18n.translate(
  'xpack.cases.casesRedesign.details.applyTemplateToSeeFields',
  {
    defaultMessage: 'Apply a template to see its fields here.',
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

export const CONNECTOR_SETTINGS_ARIA_LABEL = i18n.translate(
  'xpack.cases.casesRedesign.details.connectorSettingsAriaLabel',
  {
    defaultMessage: 'Connector settings',
  }
);

export const LEGACY_CUSTOM_FIELDS_TITLE = i18n.translate(
  'xpack.cases.casesRedesign.details.legacyCustomFieldsTitle',
  {
    defaultMessage: 'Legacy custom fields',
  }
);

export const RESIZE_SIDEBAR = i18n.translate('xpack.cases.casesRedesign.details.resizeSidebar', {
  defaultMessage: 'Resize the case details panel',
});

export const NO_VALUE = i18n.translate('xpack.cases.casesRedesign.details.noValue', {
  defaultMessage: 'No value',
});

export const UNSAVED_CHANGES_COUNT = (count: number) =>
  i18n.translate('xpack.cases.casesRedesign.details.unsavedChangesCount', {
    values: { count },
    defaultMessage: '{count} unsaved',
  });

export const REVERT_FIELD = i18n.translate('xpack.cases.casesRedesign.details.revertField', {
  defaultMessage: 'Revert',
});

export const FIELD_MODIFIED = i18n.translate('xpack.cases.casesRedesign.details.fieldModified', {
  defaultMessage: 'Modified',
});

export const CHANGE_TEMPLATE = i18n.translate('xpack.cases.casesRedesign.details.changeTemplate', {
  defaultMessage: 'Change template',
});

export const CHANGE_TEMPLATE_HINT = i18n.translate(
  'xpack.cases.casesRedesign.details.changeTemplateHint',
  {
    defaultMessage:
      "The current template's fields will be hidden, but their saved values stay on the case. To remove the values, clear the fields before changing the template.",
  }
);

export const CHANGE_TEMPLATE_HINT_ARIA = i18n.translate(
  'xpack.cases.casesRedesign.details.changeTemplateHintAriaLabel',
  {
    defaultMessage: 'What happens to saved values',
  }
);
