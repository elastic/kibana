/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { differenceWith, intersectionWith, isEmpty } from 'lodash';
import Boom from '@hapi/boom';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import type {
  CasePatchRequest,
  CaseRequestCustomFields,
  CasesSearchRequest,
} from '../../../common/types/api';
import { validateDuplicatedKeysInRequest } from '../validators';
import type { ICasesCustomField } from '../../custom_fields';
import { casesCustomFields } from '../../custom_fields';
import { MAX_CUSTOM_FIELDS_PER_CASE } from '../../../common/constants';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import type { TemplatesService } from '../../services/templates';
import type { FieldDefinitionsService } from '../../services/field_definitions';
import { parseTemplate } from '../../routes/api/templates/parse_template';
import { validateExtendedFields } from '../../../common/types/domain/template/validate_extended_fields';
import { parseFieldDefinitionsToInlineFields, getFieldSnakeKey } from '../../../common/utils';

interface CustomFieldValidationParams {
  requestCustomFields?: CaseRequestCustomFields;
  customFieldsConfiguration?: CustomFieldsConfiguration;
}

export const validateCustomFields = (params: CustomFieldValidationParams) => {
  validateDuplicatedKeysInRequest({
    requestFields: params.requestCustomFields,
    fieldName: 'customFields',
  });
  validateCustomFieldKeysAgainstConfiguration(params);
  validateRequiredCustomFields(params);
  validateCustomFieldTypesInRequest(params);
};

/**
 * Throws if the type doesn't match the configuration.
 */
export function validateCustomFieldTypesInRequest({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams) {
  if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
    return;
  }

  if (customFieldsConfiguration === undefined) {
    throw Boom.badRequest('No custom fields configured.');
  }

  const invalidCustomFields = intersectionWith(
    customFieldsConfiguration,
    requestCustomFields,
    (requiredVal, requestedVal) =>
      requiredVal.key === requestedVal.key && requiredVal.type !== requestedVal.type
  ).map((config) => `"${config.label ? config.label : 'Unknown'}"`);

  if (invalidCustomFields.length) {
    throw Boom.badRequest(
      `The following custom fields have the wrong type in the request: ${invalidCustomFields.join(
        ', '
      )}`
    );
  }
}

/**
 * Throws if the key doesn't match the configuration or is missing
 */
export const validateCustomFieldKeysAgainstConfiguration = ({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams) => {
  if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
    return [];
  }

  if (customFieldsConfiguration === undefined) {
    throw Boom.badRequest('No custom fields configured.');
  }

  const invalidCustomFieldKeys = differenceWith(
    requestCustomFields,
    customFieldsConfiguration,
    (requestVal, configurationVal) => requestVal.key === configurationVal.key
  ).map((e) => e.key);

  if (invalidCustomFieldKeys.length) {
    throw Boom.badRequest(`Invalid custom field keys: ${invalidCustomFieldKeys}`);
  }
};

/**
 * Returns a list of required custom fields missing from the request
 * that don't have a default value configured.
 */
export const validateRequiredCustomFields = ({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams) => {
  if (customFieldsConfiguration === undefined) {
    if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
      return;
    } else {
      throw Boom.badRequest('No custom fields configured.');
    }
  }

  const requiredCustomFields = customFieldsConfiguration.filter(
    (customField) => customField.required
  );

  if (!requiredCustomFields.length) {
    return;
  }

  const missingRequiredCustomFields = differenceWith(
    requiredCustomFields,
    requestCustomFields ?? [],
    (configuration, request) => configuration.key === request.key
  ) // missing custom field and missing defaultValue -> error
    .filter(
      (customField) => customField.defaultValue === undefined || customField.defaultValue === null
    )
    .map((e) => `"${e.label}"`);

  if (missingRequiredCustomFields.length) {
    throw Boom.badRequest(
      `Missing required custom fields without default value configured: ${missingRequiredCustomFields.join(
        ', '
      )}`
    );
  }

  const nullRequiredCustomFields = requiredCustomFields
    .filter((requiredField) => {
      const found = requestCustomFields?.find(
        (requestField) => requestField.key === requiredField.key
      );

      // required custom fields cannot be set to null
      return found && found.value === null;
    })
    .map((e) => `"${e.label}"`);

  if (nullRequiredCustomFields.length) {
    throw Boom.badRequest(
      `Invalid value "null" supplied for the following required custom fields: ${nullRequiredCustomFields.join(
        ', '
      )}`
    );
  }
};

/**
 * Parses isGlobal field definitions for the given owner and returns the
 * set of valid extended-field snake_case keys those definitions produce.
 *
 * Uses the unsecured SO client directly because the `owner` has already been
 * validated by `authorization.ensureAuthorized` on the parent case operation —
 * no additional privilege check is required here.
 */
export const resolveGlobalFieldKeys = async (
  owner: string,
  fieldDefinitionsService: FieldDefinitionsService
): Promise<Set<string>> => {
  const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(owner, {
    isGlobal: true,
  });
  const inlineFields = parseFieldDefinitionsToInlineFields(fieldDefinitions);
  return new Set(inlineFields.map((f) => getFieldSnakeKey(f.name, f.type)));
};

export const validateExtendedFieldsInRequest = async ({
  updateReq,
  originalCase,
  templatesService,
  globalKeys,
}: {
  updateReq: CasePatchRequest;
  originalCase: CaseSavedObjectTransformed;
  templatesService: TemplatesService;
  globalKeys: Set<string>;
}): Promise<void> => {
  if (!updateReq.extended_fields) return;

  // null means the template is being cleared; undefined means it is not changing.
  const templateId =
    updateReq.template === null
      ? null
      : updateReq.template?.id ?? originalCase.attributes.template?.id;

  if (!templateId) {
    // No template (either never set or being cleared) — only global field keys are permitted.
    const invalidKeys = Object.keys(updateReq.extended_fields).filter((k) => !globalKeys.has(k));
    if (invalidKeys.length) {
      throw Boom.badRequest(
        `extended_fields keys [${invalidKeys.join(
          ', '
        )}] are not global (isGlobal) field definitions`
      );
    }
    return;
  }

  const templateSO = await templatesService.getTemplate(templateId);
  if (!templateSO) {
    throw Boom.badRequest(`Template ${templateId} not found`);
  }
  let parsedTemplate;
  try {
    parsedTemplate = parseTemplate(templateSO.attributes);
  } catch (err) {
    throw Boom.badRequest(`Template ${templateId} has an invalid definition`);
  }

  // Validate only the template-specific keys (global keys are always valid).
  const templateOnlyFields = Object.fromEntries(
    Object.entries(updateReq.extended_fields).filter(([k]) => !globalKeys.has(k))
  );
  const errors = validateExtendedFields(templateOnlyFields, parsedTemplate.definition.fields, {
    partial: true,
  });
  if (errors.length) {
    throw Boom.badRequest(`Invalid extended_fields: ${errors.join('; ')}`);
  }
};

export const validateSearchCasesCustomFields = ({
  customFieldsConfiguration,
  customFields,
}: {
  customFieldsConfiguration: CustomFieldsConfiguration;
  customFields: CasesSearchRequest['customFields'];
}) => {
  let customFieldsMapping: ICasesCustomField | null = null;

  if (!customFields || isEmpty(customFields)) {
    return;
  }

  if (!customFieldsConfiguration.length) {
    throw Boom.badRequest('No custom fields configured.');
  }

  if (Object.keys(customFields).length > MAX_CUSTOM_FIELDS_PER_CASE) {
    throw Boom.badRequest(`Maximum ${MAX_CUSTOM_FIELDS_PER_CASE} customFields are allowed.`);
  }

  Object.entries(customFields).forEach(([key, value]) => {
    const customFieldConfig = customFieldsConfiguration.find((config) => config.key === key);

    if (!customFieldConfig) {
      throw Boom.badRequest(`Invalid custom field key: ${key}.`);
    }

    customFieldsMapping = casesCustomFields.get(customFieldConfig.type);

    if (!customFieldsMapping?.isFilterable) {
      throw Boom.badRequest(
        `Filtering by custom field of type ${customFieldConfig.type} is not allowed.`
      );
    }

    customFieldsMapping?.validateFilteringValues(value);
  });
};
