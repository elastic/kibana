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

export const DELETE_CASES_FAILED_MESSAGE = (caseIds: string[], errorMessage: string) =>
  i18n.translate('xpack.cases.workflowSteps.deleteCases.error.casesCouldNotBeDeleted', {
    defaultMessage: 'Cases could not be deleted: {caseIds}. Reason: {errorMessage}',
    values: { caseIds: caseIds.join(', '), errorMessage },
  });

export const DELETE_ATTACHMENTS_FAILED_MESSAGE = (
  caseId: string,
  ids: string[],
  errorMessage: string
) =>
  i18n.translate('xpack.cases.workflowSteps.deleteAttachments.error.attachmentsCouldNotBeDeleted', {
    defaultMessage:
      'Attachments could not be deleted on case "{caseId}": {ids}. Reason: {errorMessage}',
    values: { caseId, ids: ids.join(', '), errorMessage },
  });

export const BULK_DELETE_OBSERVABLES_FAILED_MESSAGE = (
  caseId: string,
  observableIds: string[],
  errorMessage: string
) =>
  i18n.translate(
    'xpack.cases.workflowSteps.bulkDeleteObservables.error.observablesCouldNotBeDeleted',
    {
      defaultMessage:
        'Observables could not be deleted on case "{caseId}": {observableIds}. Reason: {errorMessage}',
      values: { caseId, observableIds: observableIds.join(', '), errorMessage },
    }
  );

export const SET_CUSTOM_FIELD_FAILED_MESSAGE = (caseId: string, fieldName: string) =>
  i18n.translate(
    'xpack.cases.workflowSteps.setCustomField.error.caseCustomFieldCouldNotBeUpdated',
    {
      defaultMessage: 'Custom field "{fieldName}" on case "{caseId}" could not be updated.',
      values: { caseId, fieldName },
    }
  );

export const SET_EXTENDED_FIELDS_FAILED_MESSAGE = (caseId: string, errorMessage: string) =>
  i18n.translate(
    'xpack.cases.workflowSteps.setExtendedFields.error.extendedFieldsCouldNotBeUpdated',
    {
      defaultMessage:
        'Extended fields on case "{caseId}" could not be updated. Reason: {errorMessage}',
      values: { caseId, errorMessage },
    }
  );

export const FIND_SIMILAR_CASES_FAILED_MESSAGE = (caseId: string) =>
  i18n.translate('xpack.cases.workflowSteps.findSimilarCases.error.similarCasesCouldNotBeFound', {
    defaultMessage: 'Similar cases could not be found for case "{caseId}".',
    values: { caseId },
  });

export const MERGE_CASES_FAILED_MESSAGE = (caseIds: string[], errorMessage: string) =>
  i18n.translate('xpack.cases.workflowSteps.mergeCases.error.casesCouldNotBeMerged', {
    defaultMessage: 'Cases {caseIds} could not be merged. Reason: {errorMessage}',
    values: { caseIds: caseIds.join(', '), errorMessage },
  });

export const MERGE_CASES_BLOCKED_MESSAGE = (problems: string[]) =>
  i18n.translate('xpack.cases.workflowSteps.mergeCases.error.mergeBlocked', {
    defaultMessage:
      'The cases were not merged and nothing changed. Give a value for each conflict and leave out items over a limit, then run the step again: {problems}',
    values: { problems: problems.join('; ') },
  });

export const MERGE_CASES_CONFLICT_DIFFERENT_VALUES = (field: string) =>
  i18n.translate('xpack.cases.workflowSteps.mergeCases.error.conflictDifferentValues', {
    defaultMessage: '{field}: the cases hold different values, set fields.{field}',
    values: { field },
  });

export const MERGE_CASES_CONFLICT_INVALID_VALUE = (field: string, message?: string) =>
  i18n.translate('xpack.cases.workflowSteps.mergeCases.error.conflictInvalidValue', {
    defaultMessage: '{field}: the value is not valid for the destination template{details}',
    values: { field, details: message ? ` (${message})` : '' },
  });

export const MERGE_CASES_CONFLICT_REQUIRED = (field: string) =>
  i18n.translate('xpack.cases.workflowSteps.mergeCases.error.conflictRequired', {
    defaultMessage: '{field}: the destination template requires a value',
    values: { field },
  });

export const MERGE_CASES_LIMIT_EXCEEDED = (
  kind: string,
  total: number,
  max: number,
  overBy: number
) =>
  i18n.translate('xpack.cases.workflowSteps.mergeCases.error.limitExceeded', {
    defaultMessage: '{kind}: {total} is over the limit of {max}, leave out {overBy}',
    values: { kind, total, max, overBy },
  });
