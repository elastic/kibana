/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';
export * from '../user_profiles/translations';

export const ADDED_FIELD = i18n.translate('xpack.cases.caseView.actionLabel.addedField', {
  defaultMessage: 'added',
});

export const CHANGED_FIELD = i18n.translate('xpack.cases.caseView.actionLabel.changededField', {
  defaultMessage: 'changed',
});

export const ENABLED_SETTING = i18n.translate('xpack.cases.caseView.actionLabel.enabledSetting', {
  defaultMessage: 'enabled',
});

export const DISABLED_SETTING = i18n.translate('xpack.cases.caseView.actionLabel.disableSetting', {
  defaultMessage: 'disabled',
});

export const SELECTED_THIRD_PARTY = (thirdParty: string) =>
  i18n.translate('xpack.cases.caseView.actionLabel.selectedThirdParty', {
    values: {
      thirdParty,
    },
    defaultMessage: 'selected { thirdParty } as incident management system',
  });

export const REMOVED_THIRD_PARTY = i18n.translate(
  'xpack.cases.caseView.actionLabel.removedThirdParty',
  {
    defaultMessage: 'removed external incident management system',
  }
);

export const EDITED_FIELD = i18n.translate('xpack.cases.caseView.actionLabel.editedField', {
  defaultMessage: 'edited',
});

export const REMOVED_FIELD = i18n.translate('xpack.cases.caseView.actionLabel.removedField', {
  defaultMessage: 'removed',
});

export const CHANGED_FIELD_TO_EMPTY = (field: string) =>
  i18n.translate('xpack.cases.caseView.actionLabel.changeFieldToEmpty', {
    values: { field },
    defaultMessage: 'changed {field} to "None"',
  });

export const VIEW_INCIDENT = (incidentNumber: string) =>
  i18n.translate('xpack.cases.caseView.actionLabel.viewIncident', {
    defaultMessage: 'View {incidentNumber}',
    values: {
      incidentNumber,
    },
  });

export const PUSHED_NEW_INCIDENT = i18n.translate(
  'xpack.cases.caseView.actionLabel.pushedNewIncident',
  {
    defaultMessage: 'pushed as new incident',
  }
);

export const UPDATE_INCIDENT = i18n.translate('xpack.cases.caseView.actionLabel.updateIncident', {
  defaultMessage: 'updated incident',
});

export const ADDED_DESCRIPTION = i18n.translate('xpack.cases.caseView.actionLabel.addDescription', {
  defaultMessage: 'added description',
});

export const EDIT_DESCRIPTION = i18n.translate('xpack.cases.caseView.edit.description', {
  defaultMessage: 'Edit description',
});

export const COLLAPSE_DESCRIPTION = i18n.translate('xpack.cases.caseView.description.collapse', {
  defaultMessage: 'Collapse description',
});

export const EXPAND_DESCRIPTION = i18n.translate('xpack.cases.caseView.description.expand', {
  defaultMessage: 'Expand description',
});

export const QUOTE = i18n.translate('xpack.cases.caseView.edit.quote', {
  defaultMessage: 'Quote',
});

export const EDIT_COMMENT = i18n.translate('xpack.cases.caseView.edit.comment', {
  defaultMessage: 'Edit comment',
});

export const DELETE_COMMENT = i18n.translate('xpack.cases.caseView.delete.comment', {
  defaultMessage: 'Delete comment',
});

export const DELETE_COMMENT_TITLE = i18n.translate('xpack.cases.caseView.deleteTitle.comment', {
  defaultMessage: 'Delete this comment?',
});

export const ON = i18n.translate('xpack.cases.caseView.actionLabel.on', {
  defaultMessage: 'on',
});

export const STATUS = i18n.translate('xpack.cases.caseView.statusLabel', {
  defaultMessage: 'Status',
});

export const CASE = i18n.translate('xpack.cases.caseView.case', {
  defaultMessage: 'case',
});

export const COMMENT = i18n.translate('xpack.cases.caseView.comment', {
  defaultMessage: 'comment',
});

export const CASE_REFRESH = i18n.translate('xpack.cases.caseView.caseRefresh', {
  defaultMessage: 'Refresh case',
});

export const ACTIVITY = i18n.translate('xpack.cases.caseView.activity', {
  defaultMessage: 'Activity',
});

export const CASE_SETTINGS = i18n.translate('xpack.cases.caseView.caseSettings', {
  defaultMessage: 'Case settings',
});

export const EMAIL_SUBJECT = (caseTitle: string) =>
  i18n.translate('xpack.cases.caseView.emailSubject', {
    values: { caseTitle },
    defaultMessage: 'Security Case - {caseTitle}',
  });

export const EMAIL_BODY = (caseUrl: string) =>
  i18n.translate('xpack.cases.caseView.emailBody', {
    values: { caseUrl },
    defaultMessage: 'Case reference: {caseUrl}',
  });

export const CHANGED_CONNECTOR_FIELD = i18n.translate('xpack.cases.caseView.fieldChanged', {
  defaultMessage: `changed connector field`,
});

export const SYNC_ALERTS = i18n.translate('xpack.cases.caseView.syncAlertsLabel', {
  defaultMessage: `Sync alerts`,
});

export const SYNC_ALERTS_LC = i18n.translate('xpack.cases.caseView.syncAlertsLowercaseLabel', {
  defaultMessage: `sync alerts`,
});

export const EXTRACT_OBSERVABLES_LC = i18n.translate(
  'xpack.cases.caseView.extractObservablesLowercaseLabel',
  {
    defaultMessage: `extract observables`,
  }
);

export const DOES_NOT_EXIST_TITLE = i18n.translate('xpack.cases.caseView.doesNotExist.title', {
  defaultMessage: 'This case does not exist',
});

export const DOES_NOT_EXIST_DESCRIPTION = (caseId: string) =>
  i18n.translate('xpack.cases.caseView.doesNotExist.description', {
    values: {
      caseId,
    },
    defaultMessage:
      'A case with id {caseId} could not be found. This likely means the case has been deleted, or the id is incorrect.',
  });

export const DOES_NOT_EXIST_BUTTON = i18n.translate('xpack.cases.caseView.doesNotExist.button', {
  defaultMessage: 'Back to Cases',
});

export const ACTIVITY_TAB = i18n.translate('xpack.cases.caseView.tabs.activity', {
  defaultMessage: 'Activity',
});

export const ATTACHMENTS_TAB = i18n.translate('xpack.cases.caseView.tabs.attachments', {
  defaultMessage: 'Attachments',
});

export const OBSERVABLES_TAB = i18n.translate('xpack.cases.caseView.tabs.observables', {
  defaultMessage: 'Observables',
});

export const SIMILAR_CASES_TAB = i18n.translate('xpack.cases.caseView.tabs.similar', {
  defaultMessage: 'Similar cases',
});

export const EDIT_ASSIGNEES_ARIA_LABEL = i18n.translate(
  'xpack.cases.caseView.editAssigneesAriaLabel',
  {
    defaultMessage: 'click to edit assignees',
  }
);

export const NO_ASSIGNEES = i18n.translate('xpack.cases.caseView.noAssignees', {
  defaultMessage: 'No users are assigned',
});

export const ASSIGN_A_USER = i18n.translate('xpack.cases.caseView.assignUser', {
  defaultMessage: 'Assign a user',
});

export const SPACED_OR = i18n.translate('xpack.cases.caseView.spacedOrText', {
  defaultMessage: ' or ',
});

export const ASSIGN_YOURSELF = i18n.translate('xpack.cases.caseView.assignYourself', {
  defaultMessage: 'assign yourself',
});

export const TOTAL_USERS_ASSIGNED = (total: number) =>
  i18n.translate('xpack.cases.caseView.totalUsersAssigned', {
    defaultMessage: '{total} assigned',
    values: { total },
  });

export const ADDED_OBSERVABLES = (totalObservables: number): string =>
  i18n.translate('xpack.cases.caseView.observables.addedObservables', {
    values: { totalObservables },
    defaultMessage:
      'added {totalObservables, plural, =1 {an} other {{totalObservables}}} {totalObservables, plural, =1 {observable} other {observables}}',
  });

export const EDIT_FIELD_ARIA_LABEL = (fieldName: string) =>
  i18n.translate('xpack.cases.caseView.editFieldAriaLabel', {
    values: { fieldName },
    defaultMessage: 'Edit {fieldName}',
  });

export const DELETED_OBSERVABLES = (totalObservables: number): string =>
  i18n.translate('xpack.cases.caseView.observables.deletedObservables', {
    values: { totalObservables },
    defaultMessage:
      'deleted {totalObservables, plural, =1 {an} other {{totalObservables}}} {totalObservables, plural, =1 {observable} other {observables}}',
  });

export const FIELD_NOT_DEFINED = i18n.translate('xpack.cases.caseView.fieldNotDefined', {
  defaultMessage: 'Field not defined',
});

export const UPDATED_OBSERVABLES = (totalObservables: number): string =>
  i18n.translate('xpack.cases.caseView.observables.updatedObservables', {
    values: { totalObservables },
    defaultMessage:
      'updated {totalObservables, plural, =1 {an} other {{totalObservables}}} {totalObservables, plural, =1 {observable} other {observables}}',
  });

export const FIELD_SUBMISSION_ERROR = i18n.translate('xpack.cases.caseView.fieldSubmissionError', {
  defaultMessage: 'Error submitting field',
});

export const TEMPLATE_CHANGED_SUCCESSFULLY = i18n.translate(
  'xpack.cases.caseView.changeAppliedTemplate.successToast',
  {
    defaultMessage: 'Template changed successfully.',
  }
);

export const ERROR_CHANGING_TEMPLATE = i18n.translate(
  'xpack.cases.caseView.changeAppliedTemplate.errorToast',
  {
    defaultMessage: 'Error changing template',
  }
);

export const TEMPLATE_UPDATED_TITLE = i18n.translate(
  'xpack.cases.caseView.changeAppliedTemplate.successToastTitle',
  {
    defaultMessage: 'Template updated',
  }
);

export const TEMPLATE_UPDATED_TEXT = i18n.translate(
  'xpack.cases.caseView.changeAppliedTemplate.successToastText',
  {
    defaultMessage: 'Reload the page to see your changes.',
  }
);

export const RELOAD_PAGE = i18n.translate(
  'xpack.cases.caseView.changeAppliedTemplate.reloadPageButton',
  {
    defaultMessage: 'Reload page',
  }
);

export const EXTENDED_FIELDS_TITLE = i18n.translate('xpack.cases.caseView.extendedFieldsTitle', {
  defaultMessage: 'Extended fields',
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
