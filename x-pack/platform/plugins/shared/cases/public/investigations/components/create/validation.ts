/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import type { InvestigationPriority } from '../../../../common/investigations/types';
import * as i18n from './translations';
import { MAX_TITLE_LENGTH } from '../../../../common/constants';

export interface CreateFormValues {
  title: string;
  description: string;
  /** Template id of the chosen investigation type. */
  templateId: string;
  priority: InvestigationPriority;
  tags: string[];
  entities: string[];
  alertIds: string[];
  aiEnabled: boolean;
}

export interface CreateFormErrors {
  title?: string;
  description?: string;
  templateId?: string;
  tags?: string;
}

export const EMPTY_FORM: CreateFormValues = {
  title: '',
  description: '',
  templateId: '',
  priority: 'medium',
  tags: [],
  entities: [],
  alertIds: [],
  aiEnabled: true,
};

export const validateForm = (values: CreateFormValues): CreateFormErrors => {
  const errors: CreateFormErrors = {};
  const title = values.title.trim();
  const description = values.description.trim();

  if (title.length === 0) {
    errors.title = i18n.TITLE_REQUIRED;
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = i18n.TITLE_TOO_LONG(MAX_TITLE_LENGTH);
  }

  if (description.length === 0) {
    errors.description = i18n.DESCRIPTION_REQUIRED;
  } else if (description.length > INVESTIGATION_LIMITS.maxTextLength) {
    errors.description = i18n.DESCRIPTION_TOO_LONG(INVESTIGATION_LIMITS.maxTextLength);
  }

  if (values.templateId.length === 0) {
    errors.templateId = i18n.TYPE_REQUIRED;
  }

  if (values.tags.length > INVESTIGATION_LIMITS.maxTags) {
    errors.tags = i18n.TOO_MANY_TAGS(INVESTIGATION_LIMITS.maxTags);
  } else if (values.tags.some((tag) => tag.length > INVESTIGATION_LIMITS.maxTagLength)) {
    errors.tags = i18n.TAG_TOO_LONG(INVESTIGATION_LIMITS.maxTagLength);
  }

  return errors;
};

export const hasErrors = (errors: CreateFormErrors): boolean => Object.values(errors).some(Boolean);
