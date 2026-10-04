/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  CustomFieldsConfiguration,
  CustomFieldTypes,
  ExternalSyncFieldMappings,
  ExternalSyncFieldRules,
  TemplatesConfiguration,
} from '../../../common/types/domain';
import {
  EXTERNAL_SYNC_FIELD_DIRECTIONS,
  MAX_EXTERNAL_SYNC_FIELD_MAPPINGS,
} from '../../../common/utils/external_sync_fields';
import { isSafeExtendedFieldKey } from '../../../common/utils/template_fields';
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
 * Throws when a field appears twice or asks for a direction the engine cannot honor for it.
 */
export const validateExternalSyncFieldsInRequest = (rules?: ExternalSyncFieldRules) => {
  if (!Array.isArray(rules) || rules.length === 0) {
    return;
  }

  const seen = new Set<string>();
  const duplicated: string[] = [];
  const unsupported: string[] = [];

  for (const rule of rules) {
    if (seen.has(rule.field)) {
      duplicated.push(rule.field);
    }
    seen.add(rule.field);

    const allowed = EXTERNAL_SYNC_FIELD_DIRECTIONS[rule.field];
    if (!allowed.includes(rule.direction)) {
      unsupported.push(
        `"${rule.field}" cannot sync with direction "${rule.direction}" (allowed: ${allowed.join(
          ', '
        )})`
      );
    }
  }

  if (duplicated.length > 0) {
    throw Boom.badRequest(
      `Invalid value "${duplicated.join(
        ','
      )}" supplied to "externalSyncFields": a field may appear only once`
    );
  }

  if (unsupported.length > 0) {
    throw Boom.badRequest(`Invalid externalSyncFields: ${unsupported.join('; ')}`);
  }
};

/**
 * Throws when an external field is mapped twice, targets an unsafe case field key, or the
 * connector's free-form field limit is exceeded.
 */
export const validateExternalSyncFieldMappingsInRequest = (
  mappings?: ExternalSyncFieldMappings
) => {
  if (!Array.isArray(mappings) || mappings.length === 0) {
    return;
  }

  if (mappings.length > MAX_EXTERNAL_SYNC_FIELD_MAPPINGS) {
    throw Boom.badRequest(
      `Invalid externalSyncFieldMappings: at most ${MAX_EXTERNAL_SYNC_FIELD_MAPPINGS} fields can be mapped per connector`
    );
  }

  const seen = new Set<string>();
  const duplicated: string[] = [];
  const unsafe: string[] = [];

  for (const mapping of mappings) {
    if (seen.has(mapping.externalField)) {
      duplicated.push(mapping.externalField);
    }
    seen.add(mapping.externalField);

    if (mapping.externalField.trim().length === 0 || !isSafeExtendedFieldKey(mapping.caseField)) {
      unsafe.push(`${mapping.externalField} -> ${mapping.caseField}`);
    }
  }

  if (duplicated.length > 0) {
    throw Boom.badRequest(
      `Invalid value "${duplicated.join(
        ','
      )}" supplied to "externalSyncFieldMappings": an external field may be mapped only once`
    );
  }

  if (unsafe.length > 0) {
    throw Boom.badRequest(
      `Invalid externalSyncFieldMappings: ${unsafe.join('; ')} does not name a valid case field`
    );
  }
};
