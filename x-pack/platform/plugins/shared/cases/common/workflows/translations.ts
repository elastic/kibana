/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CREATE_CASE_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.createCase.label', {
  defaultMessage: 'Cases - Create case',
});

export const CREATE_CASE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.createCase.description',
  {
    defaultMessage: 'Creates a new case with the specified attributes',
  }
);

export const CREATE_CASE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.createCase.documentation.details',
  {
    defaultMessage:
      'This step creates a new case in the cases system. You can specify title, description, tags, assignees, severity, category, connector configuration, sync settings, and custom fields. The step returns the complete created case object.',
  }
);

export const CREATE_CASE_FROM_TEMPLATE_STEP_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.createCaseFromTemplate.label',
  {
    defaultMessage: 'Cases - Create case from template',
  }
);

export const CREATE_CASE_FROM_TEMPLATE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.createCaseFromTemplate.description',
  {
    defaultMessage:
      'Creates a new security case using a configured case template and optional overwrites',
  }
);

export const CREATE_CASE_FROM_TEMPLATE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.createCaseFromTemplate.documentation.details',
  {
    defaultMessage:
      'This step resolves a case template from the securitySolution case configuration and creates a new case. You can optionally provide overwrite fields to customize the created case.',
  }
);

export const UPDATE_CASE_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.updateCase.label', {
  defaultMessage: 'Cases - Update case',
});

export const UPDATE_CASE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.updateCase.description',
  {
    defaultMessage: 'Updates a case with the provided fields',
  }
);

export const UPDATE_CASE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.updateCase.documentation.details',
  {
    defaultMessage:
      'This step updates a case using the provided fields. If a version is provided, it is used directly. Otherwise, the step fetches the case to resolve the latest version before updating.',
  }
);

export const UPDATE_CASES_STEP_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.updateCases.label',
  {
    defaultMessage: 'Update cases',
  }
);

export const UPDATE_CASES_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.updateCases.description',
  {
    defaultMessage: 'Updates multiple cases in one step',
  }
);

export const UPDATE_CASES_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.updateCases.documentation.details',
  {
    defaultMessage:
      'This step updates multiple cases at once. Each case can provide a version directly or let the step fetch the latest version before applying updates.',
  }
);

export const SET_CUSTOM_FIELD_STEP_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.setCustomField.label',
  {
    defaultMessage: 'Set case custom field',
  }
);

export const SET_CUSTOM_FIELD_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.setCustomField.description',
  {
    defaultMessage: 'Sets a single custom field value on an existing case',
  }
);

export const SET_CUSTOM_FIELD_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.setCustomField.documentation.details',
  {
    defaultMessage:
      'This step updates one custom field on a case by field name. Use `field_name` to select the field key and `value` to set the new value.',
  }
);

export const ADD_COMMENT_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.addComment.label', {
  defaultMessage: 'Cases - Add comment',
});

export const ADD_COMMENT_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.addComment.description',
  {
    defaultMessage: 'Adds a user comment to a case',
  }
);

export const ADD_COMMENT_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.addComment.documentation.details',
  {
    defaultMessage: 'This step appends a new user comment to the selected case.',
  }
);

export const GET_CASE_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.getCase.label', {
  defaultMessage: 'Cases - Get case by ID',
});

export const GET_CASE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.getCase.description',
  {
    defaultMessage: 'Retrieves a case using its unique identifier',
  }
);

export const GET_CASE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.getCase.documentation.details',
  {
    defaultMessage:
      'This step retrieves a complete case object from the cases system using its ID. You can optionally include comments and attachments in the response.',
  }
);

export const FIND_CASES_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.findCases.label', {
  defaultMessage: 'Find cases',
});

export const FIND_CASES_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.findCases.description',
  {
    defaultMessage: 'Searches and filters cases',
  }
);

export const FIND_CASES_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.findCases.documentation.details',
  {
    defaultMessage:
      'This step searches cases and returns matching results, including pagination metadata and case status counters.',
  }
);

export const SET_SEVERITY_STEP_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.setSeverity.label',
  {
    defaultMessage: 'Set case severity',
  }
);

export const SET_SEVERITY_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.setSeverity.description',
  {
    defaultMessage: 'Sets severity for an existing case',
  }
);

export const SET_SEVERITY_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.setSeverity.documentation.details',
  {
    defaultMessage:
      'This step sets only the severity field of an existing case. If version is not provided, the latest case version is resolved automatically.',
  }
);

export const SET_STATUS_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.setStatus.label', {
  defaultMessage: 'Set case status',
});

export const SET_STATUS_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.setStatus.description',
  {
    defaultMessage: 'Sets status for an existing case',
  }
);

export const SET_STATUS_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.setStatus.documentation.details',
  {
    defaultMessage:
      'This step sets only the status field of an existing case. If version is not provided, the latest case version is resolved automatically.',
  }
);

export const CLOSE_CASE_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.closeCase.label', {
  defaultMessage: 'Close case',
});

export const CLOSE_CASE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.closeCase.description',
  {
    defaultMessage: 'Closes an existing case',
  }
);

export const CLOSE_CASE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.closeCase.documentation.details',
  {
    defaultMessage:
      'This step closes an existing case by setting its status to `closed`. If version is not provided, the latest case version is resolved automatically.',
  }
);

export const ASSIGN_CASE_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.assignCase.label', {
  defaultMessage: 'Assign case',
});

export const ASSIGN_CASE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.assignCase.description',
  {
    defaultMessage: 'Sets assignees for an existing case',
  }
);

export const ASSIGN_CASE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.assignCase.documentation.details',
  {
    defaultMessage:
      'This step sets the assignees array on an existing case. The provided assignees become the full source of truth for assignment.',
  }
);

export const UNASSIGN_CASE_STEP_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.unassignCase.label',
  {
    defaultMessage: 'Unassign case',
  }
);

export const UNASSIGN_CASE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.unassignCase.description',
  {
    defaultMessage: 'Sets assignees after unassignment for an existing case',
  }
);

export const UNASSIGN_CASE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.unassignCase.documentation.details',
  {
    defaultMessage:
      'This step sets the assignees array on an existing case after unassignment logic in your workflow. Provide an empty array to clear all assignees.',
  }
);

export const ADD_ALERTS_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.addAlerts.label', {
  defaultMessage: 'Add alerts to case',
});

export const ADD_ALERTS_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.addAlerts.description',
  {
    defaultMessage: 'Adds one or more alerts as case attachments',
  }
);

export const ADD_ALERTS_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.addAlerts.documentation.details',
  {
    defaultMessage:
      'This step adds alert attachments to an existing case. Each alert requires an `alertId` and source `index`; rule metadata is optional.',
  }
);

export const ADD_EVENTS_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.addEvents.label', {
  defaultMessage: 'Add events to case',
});

export const ADD_EVENTS_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.addEvents.description',
  {
    defaultMessage: 'Adds one or more events as case attachments',
  }
);

export const ADD_EVENTS_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.addEvents.documentation.details',
  {
    defaultMessage:
      'This step adds event attachments to an existing case. Each event requires an `eventId` and source `index`.',
  }
);

export const FIND_SIMILAR_CASES_STEP_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.findSimilarCases.label',
  {
    defaultMessage: 'Find similar cases',
  }
);

export const FIND_SIMILAR_CASES_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.findSimilarCases.description',
  {
    defaultMessage: 'Finds cases similar to the provided case ID',
  }
);

export const FIND_SIMILAR_CASES_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.findSimilarCases.documentation.details',
  {
    defaultMessage:
      'This step returns cases similar to the given case, based on shared observables, with pagination metadata.',
  }
);

export const SET_DESCRIPTION_STEP_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.setDescription.label',
  {
    defaultMessage: 'Set case description',
  }
);

export const SET_DESCRIPTION_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.setDescription.description',
  {
    defaultMessage: 'Sets description for an existing case',
  }
);

export const SET_DESCRIPTION_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.setDescription.documentation.details',
  {
    defaultMessage:
      'This step sets only the description field of an existing case. If version is not provided, the latest case version is resolved automatically.',
  }
);

export const SET_TITLE_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.setTitle.label', {
  defaultMessage: 'Set case title',
});

export const SET_TITLE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.setTitle.description',
  {
    defaultMessage: 'Sets title for an existing case',
  }
);

export const SET_TITLE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.setTitle.documentation.details',
  {
    defaultMessage:
      'This step sets only the title field of an existing case. If version is not provided, the latest case version is resolved automatically.',
  }
);

export const ADD_OBSERVABLES_STEP_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.addObservables.label',
  {
    defaultMessage: 'Add observables to case',
  }
);

export const ADD_OBSERVABLES_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.addObservables.description',
  {
    defaultMessage: 'Adds one or more observables to a case',
  }
);

export const ADD_OBSERVABLES_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.addObservables.documentation.details',
  {
    defaultMessage:
      'This step adds observables to an existing case using `typeKey`, `value`, and optional description fields.',
  }
);

export const ADD_TAG_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.addTag.label', {
  defaultMessage: 'Add case tag',
});

export const ADD_TAG_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.addTag.description',
  {
    defaultMessage: 'Sets tags for an existing case',
  }
);

export const ADD_TAG_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.addTag.documentation.details',
  {
    defaultMessage:
      'This step sets the full tags array on an existing case. Provide all tags that should remain on the case.',
  }
);

export const ADD_CATEGORY_STEP_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.addCategory.label',
  {
    defaultMessage: 'Add case category',
  }
);

export const ADD_CATEGORY_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.addCategory.description',
  {
    defaultMessage: 'Sets category for an existing case',
  }
);

export const ADD_CATEGORY_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.addCategory.documentation.details',
  {
    defaultMessage: 'This step sets the category field on an existing case.',
  }
);

export const TEMPLATE_CAN_BE_USED_MESSAGE = (template: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.templateCanBeUsedMessage', {
    defaultMessage: 'Template "{template}" can be used to prefill case attributes.',
    values: { template },
  });

export const TEMPLATE_NOT_FOUND_MESSAGE = (template: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.templateNotFoundMessage', {
    defaultMessage: 'Template "{template}" was not found in case configuration.',
    values: { template },
  });

export const CASE_CAN_BE_USED_MESSAGE = (caseTitle: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.caseCanBeUsedMessage', {
    defaultMessage: 'Case "{caseTitle}" can be used as input.',
    values: { caseTitle },
  });

export const CASE_NOT_FOUND_MESSAGE = (caseId: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.caseNotFoundMessage', {
    defaultMessage: 'Case "{caseId}" was not found.',
    values: { caseId },
  });

export const CUSTOM_FIELD_CAN_BE_USED_MESSAGE = (fieldName: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.customFieldCanBeUsedMessage', {
    defaultMessage: 'Custom field "{fieldName}" can be updated by this step.',
    values: { fieldName },
  });

export const CUSTOM_FIELD_NOT_FOUND_MESSAGE = (fieldName: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.customFieldNotFoundMessage', {
    defaultMessage: 'Custom field "{fieldName}" was not found in case configuration.',
    values: { fieldName },
  });
