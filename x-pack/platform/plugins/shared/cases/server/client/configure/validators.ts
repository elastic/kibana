/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  CaseStatusesConfiguration,
  CustomFieldsConfiguration,
  CustomFieldTypes,
  TemplatesConfiguration,
} from '../../../common/types/domain';
import { MAX_CASE_STATUSES_PER_CATEGORY } from '../../../common/constants';
import { CASE_STATUS_CATEGORIES } from '../../../common/utils/statuses';
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

/**
 * Enforces what the rest of the plugin relies on: the built-in keys always exist, keys and
 * categories never change once written, and every category keeps exactly one enabled default.
 */
export const validateStatusesConfiguration = ({
  requestStatuses,
  originalStatuses = [],
  customStatusesEnabled,
}: {
  requestStatuses?: CaseStatusesConfiguration;
  originalStatuses?: CaseStatusesConfiguration;
  customStatusesEnabled: boolean;
}) => {
  if (requestStatuses === undefined) {
    return;
  }

  if (!customStatusesEnabled) {
    throw Boom.badRequest('Custom statuses are not enabled');
  }

  validateDuplicatedKeysInRequest({ requestFields: requestStatuses, fieldName: 'statuses' });

  const byKey = new Map(requestStatuses.map((status) => [status.key, status]));

  for (const category of CASE_STATUS_CATEGORIES) {
    const builtIn = byKey.get(category);

    if (!builtIn) {
      throw Boom.badRequest(`The built-in status "${category}" is required`);
    }

    if (builtIn.category !== category) {
      throw Boom.badRequest(
        `The built-in status "${category}" must belong to the "${category}" category`
      );
    }
  }

  for (const category of CASE_STATUS_CATEGORIES) {
    const inCategory = requestStatuses.filter((status) => status.category === category);

    if (inCategory.length > MAX_CASE_STATUSES_PER_CATEGORY) {
      throw Boom.badRequest(
        `The category "${category}" can have at most ${MAX_CASE_STATUSES_PER_CATEGORY} statuses`
      );
    }

    const labels = inCategory.map((status) => status.label.trim().toLowerCase());
    const duplicatedLabels = labels.filter((label, index) => labels.indexOf(label) !== index);

    if (duplicatedLabels.length > 0) {
      throw Boom.badRequest(
        `Invalid duplicated statuses labels in category "${category}": ${[
          ...new Set(duplicatedLabels),
        ].join(', ')}`
      );
    }

    if (!inCategory.some((status) => !status.disabled)) {
      throw Boom.badRequest(`The category "${category}" needs at least one enabled status`);
    }

    const defaults = inCategory.filter((status) => status.isDefault);

    if (defaults.length !== 1) {
      throw Boom.badRequest(`The category "${category}" must have exactly one default status`);
    }

    if (defaults[0].disabled) {
      throw Boom.badRequest(`The default status of the category "${category}" cannot be disabled`);
    }
  }

  for (const original of originalStatuses) {
    const updated = byKey.get(original.key);

    if (!updated) {
      throw Boom.badRequest(`The status "${original.key}" cannot be removed, disable it instead`);
    }

    if (updated.category !== original.category) {
      throw Boom.badRequest(`The category of the status "${original.key}" cannot be changed`);
    }
  }
};
