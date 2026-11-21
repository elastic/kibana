/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import type {
  InvestigationPriority,
  InvestigationSeverity,
  InvestigationType,
  RecordFields,
} from '../../../../common/investigations/types';
import * as i18n from './translations';

export type TypeField = InvestigationType['fields'][number];

/** Raw values of the type's form fields: text for inputs, booleans for switches. */
export type FieldDrafts = Record<string, string | boolean>;

export interface CreateFormValues {
  title: string;
  description: string;
  investigationType: string;
  priority: InvestigationPriority;
  severity: InvestigationSeverity;
  tags: string[];
  fieldDrafts: FieldDrafts;
  entities: string[];
  alertIds: string[];
  aiEnabled: boolean;
}

export interface CreateFormErrors {
  title?: string;
  description?: string;
  investigationType?: string;
  tags?: string;
  fields: Record<string, string>;
}

export const EMPTY_FORM: CreateFormValues = {
  title: '',
  description: '',
  investigationType: '',
  priority: 'medium',
  severity: 'medium',
  tags: [],
  fieldDrafts: {},
  entities: [],
  alertIds: [],
  aiEnabled: true,
};

const validateField = (
  field: TypeField,
  draft: string | boolean | undefined
): string | undefined => {
  if (typeof draft !== 'string' || draft.trim() === '') {
    return undefined;
  }
  if (field.type === 'long') {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) return i18n.FIELD_NUMBER_INVALID;
    return Number.isInteger(parsed) ? undefined : i18n.FIELD_INTEGER_INVALID;
  }
  if (field.type === 'double') {
    return Number.isFinite(Number(draft)) ? undefined : i18n.FIELD_NUMBER_INVALID;
  }
  if (field.type === 'date') {
    return Number.isNaN(Date.parse(draft)) ? i18n.FIELD_DATE_INVALID : undefined;
  }
  return undefined;
};

export const validateForm = (
  values: CreateFormValues,
  type: InvestigationType | undefined
): CreateFormErrors => {
  const errors: CreateFormErrors = { fields: {} };
  const title = values.title.trim();
  const description = values.description.trim();

  if (title.length === 0) {
    errors.title = i18n.TITLE_REQUIRED;
  } else if (title.length > INVESTIGATION_LIMITS.maxTitleLength) {
    errors.title = i18n.TITLE_TOO_LONG(INVESTIGATION_LIMITS.maxTitleLength);
  }

  if (description.length === 0) {
    errors.description = i18n.DESCRIPTION_REQUIRED;
  } else if (description.length > INVESTIGATION_LIMITS.maxTextLength) {
    errors.description = i18n.DESCRIPTION_TOO_LONG(INVESTIGATION_LIMITS.maxTextLength);
  }

  if (values.investigationType.length === 0) {
    errors.investigationType = i18n.TYPE_REQUIRED;
  }

  if (values.tags.length > INVESTIGATION_LIMITS.maxTags) {
    errors.tags = i18n.TOO_MANY_TAGS(INVESTIGATION_LIMITS.maxTags);
  } else if (values.tags.some((tag) => tag.length > INVESTIGATION_LIMITS.maxTagLength)) {
    errors.tags = i18n.TAG_TOO_LONG(INVESTIGATION_LIMITS.maxTagLength);
  }

  (type?.fields ?? []).forEach((field) => {
    const message = validateField(field, values.fieldDrafts[field.key]);
    if (message) {
      errors.fields[field.key] = message;
    }
  });

  return errors;
};

export const hasErrors = ({ fields, ...rest }: CreateFormErrors): boolean =>
  Object.values(rest).some(Boolean) || Object.keys(fields).length > 0;

/** Converts the drafts of the selected type into typed values. Empty inputs are left out. */
export const buildFields = (
  type: InvestigationType | undefined,
  drafts: FieldDrafts
): RecordFields => {
  const fields: RecordFields = {};
  (type?.fields ?? []).forEach((field) => {
    const draft = drafts[field.key];
    if (field.type === 'bool') {
      if (typeof draft === 'boolean') fields[field.key] = draft;
      return;
    }
    if (typeof draft !== 'string' || draft.trim() === '') {
      return;
    }
    fields[field.key] =
      field.type === 'long' || field.type === 'double' ? Number(draft) : draft.trim();
  });
  return fields;
};
