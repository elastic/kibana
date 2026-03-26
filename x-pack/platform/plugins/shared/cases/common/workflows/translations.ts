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
      'This step first fetches the case to retrieve the latest version and then applies the requested updates.',
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
