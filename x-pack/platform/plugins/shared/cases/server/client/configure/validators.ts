/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ConfigurationRequest } from '../../../common/types/api';
import type {
  CustomFieldsConfiguration,
  CustomFieldTypes,
  TemplatesConfiguration,
} from '../../../common/types/domain';
import { ListCustomFieldConfigurationRt } from '../../../common/types/domain';
import { validateDuplicatedKeysInRequest } from '../validators';
import {
  validateCustomFieldKeysAgainstConfiguration,
  validateCustomFieldTypesInRequest as validateCaseCustomFieldTypesInRequest,
} from '../cases/validators';

/**
 * Throws an error if the request tries to change the type of existing custom fields.
 */
export const validateCustomFieldTypesInRequest = ({
  requestCustomFields,
  originalCustomFields,
}: {
  requestCustomFields?: Array<{ key: string; type: CustomFieldTypes; label: string }>;
  originalCustomFields: Array<{ key: string; type: CustomFieldTypes }>;
}) => {
  if (!Array.isArray(requestCustomFields) || !originalCustomFields.length) {
    return;
  }

  const invalidFields: string[] = [];

  requestCustomFields.forEach((requestField) => {
    const originalField = originalCustomFields.find((item) => item.key === requestField.key);

    if (originalField && originalField.type !== requestField.type) {
      invalidFields.push(`"${requestField.label}"`);
    }
  });

  if (invalidFields.length > 0) {
    throw Boom.badRequest(
      `Invalid custom field types in request for the following labels: ${invalidFields.join(', ')}`
    );
  }
};

export const validateCustomFieldDefaultValuesInRequest = ({
  requestCustomFields,
}: {
  requestCustomFields?: ConfigurationRequest['customFields'];
}) => {
  if (!Array.isArray(requestCustomFields)) {
    return;
  }

  const invalidFields: string[] = [];

  for (const requestField of requestCustomFields) {
    if (ListCustomFieldConfigurationRt.is(requestField)) {
      const hasDefaultValue = Boolean(requestField.defaultValue);
      const defaultValueIsInOptions = requestField.options.some(
        (o) => o.key === requestField.defaultValue
      );
      if (hasDefaultValue && !defaultValueIsInOptions) {
        invalidFields.push(`"${requestField.label}"`);
      }
    }
  }

  if (invalidFields.length > 0) {
    throw Boom.badRequest(
      `Default value is not present in options for the following fields: ${invalidFields.join(
        ', '
      )}`
    );
  }
};

export const validateTemplatesCustomFieldsInRequest = ({
  templates,
  customFieldsConfiguration,
}: {
  templates?: TemplatesConfiguration;
  customFieldsConfiguration?: CustomFieldsConfiguration;
}) => {
  if (!Array.isArray(templates) || !templates.length) {
    return;
  }

  templates.forEach((template, index) => {
    if (customFieldsConfiguration === undefined && template.caseFields?.customFields?.length) {
      throw Boom.badRequest('No custom fields configured.');
    }

    if (
      (!template.caseFields ||
        !template.caseFields.customFields ||
        !template.caseFields.customFields.length) &&
      customFieldsConfiguration?.length
    ) {
      throw Boom.badRequest('No custom fields added to template.');
    }

    const params = {
      requestCustomFields: template?.caseFields?.customFields,
      customFieldsConfiguration,
    };

    validateDuplicatedKeysInRequest({
      requestFields: params.requestCustomFields,
      fieldName: `templates[${index}]'s customFields`,
    });
    validateCustomFieldKeysAgainstConfiguration(params);
    validateCaseCustomFieldTypesInRequest(params);
  });
};
