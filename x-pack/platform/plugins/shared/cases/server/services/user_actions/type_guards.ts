/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import type { CaseAssignees, CaseCustomFields, CaseSettings } from '../../../common/types/domain';
import {
  CaseAssigneesSchema,
  CaseCustomFieldsSchema,
  CaseSettingsSchema,
} from '../../../common/types/domain';
import { ExtendedFieldsSchema } from '../../../common/types/domain/user_action/extended_fields/v1';

export const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((val) => isString(val));
};

export const isAssigneesArray = (value: unknown): value is CaseAssignees => {
  return CaseAssigneesSchema.safeParse(value).success;
};

export const isCustomFieldsArray = (value: unknown): value is CaseCustomFields => {
  return CaseCustomFieldsSchema.safeParse(value).success;
};

export const isCaseSettings = (value: unknown): value is CaseSettings => {
  return CaseSettingsSchema.safeParse(value).success;
};

export const isExtendedFields = (value: unknown): value is Record<string, string> => {
  return ExtendedFieldsSchema.safeParse(value).success;
};
