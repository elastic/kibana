/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPDATE_CASE_FAILED_MESSAGE = (caseId: string) =>
  i18n.translate('xpack.cases.workflowSteps.updateCase.error.caseCouldNotBeUpdated', {
    defaultMessage: 'Case "{caseId}" could not be updated.',
    values: { caseId },
  });

export const UPDATE_CASES_FAILED_MESSAGE = (caseId: string, errorMessage: string) =>
  i18n.translate('xpack.cases.workflowSteps.updateCases.error.someCasesCouldNotBeUpdated', {
    defaultMessage: 'Some cases could not be updated: {caseId}. Reason: {errorMessage}',
    values: { caseId, errorMessage },
  });

export const SET_CUSTOM_FIELD_FAILED_MESSAGE = (caseId: string, fieldName: string) =>
  i18n.translate(
    'xpack.cases.workflowSteps.setCustomField.error.caseCustomFieldCouldNotBeUpdated',
    {
      defaultMessage: 'Custom field "{fieldName}" on case "{caseId}" could not be updated.',
      values: { caseId, fieldName },
    }
  );
