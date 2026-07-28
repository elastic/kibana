/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/agent-builder-common';
import type { ConversationTemplate } from '@kbn/agent-builder-common';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;

/**
 * Validates that each field value in a template definition is compatible with its declared ES type.
 * Throws a bad-request error on the first invalid field.
 */
export const validateTemplateFields = (template: ConversationTemplate): void => {
  for (const field of template.definition.fields ?? []) {
    if (field.value === undefined) continue;

    const { name, type, value } = field;

    switch (type) {
      case 'integer': {
        if (!Number.isInteger(Number(value)) || value.trim() === '') {
          throw createBadRequestError(
            `Template "${template.id}" field "${name}": value "${value}" is not a valid integer`
          );
        }
        break;
      }
      case 'float': {
        if (Number.isNaN(Number(value)) || value.trim() === '') {
          throw createBadRequestError(
            `Template "${template.id}" field "${name}": value "${value}" is not a valid float`
          );
        }
        break;
      }
      case 'boolean': {
        if (value !== 'true' && value !== 'false') {
          throw createBadRequestError(
            `Template "${template.id}" field "${name}": value "${value}" is not a valid boolean (expected "true" or "false")`
          );
        }
        break;
      }
      case 'date': {
        if (!ISO_DATE_RE.test(value)) {
          throw createBadRequestError(
            `Template "${template.id}" field "${name}": value "${value}" is not a valid ISO 8601 date`
          );
        }
        break;
      }
      case 'keyword':
      case 'text':
        // Any string is valid for keyword/text fields.
        break;
    }
  }
};
