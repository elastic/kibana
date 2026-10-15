/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { differenceWith, intersectionWith, isEmpty, omit } from 'lodash';
import Boom from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import { CaseStatuses } from '../../../common/types/domain';
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
import { resolveTemplateFields } from '../../../common/utils/template_fields';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { isDisplayOnlyField, FieldType } from '../../../common/types/domain/template/fields';
import { evaluateCondition } from '../../../common/types/domain/template/evaluate_conditions';

interface CustomFieldValidationParams {
  requestCustomFields?: CaseRequestCustomFields;
  customFieldsConfiguration?: CustomFieldsConfiguration;
}

/**
 * Drops template fields whose storage key already belongs to a global field.
 * On a storage-key collision the global definition is authoritative (see
 * resolveApplicableFields) — shared by write-time and close-time validation so a
 * template `$ref` to a global library field is not validated twice.
 */
export const excludeTemplateFieldsCollidingWithGlobal = (
  templateFields: readonly InlineField[],
  globalFields: readonly InlineField[]
): InlineField[] => {
  const globalKeySet = new Set(globalFields.map((f) => getFieldSnakeKey(f.name, f.type)));
  return templateFields.filter((f) => !globalKeySet.has(getFieldSnakeKey(f.name, f.type)));
};

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
 * Structural-only customFields validation — duplicate keys, unknown keys, and type mismatches.
 * Deliberately excludes `validateRequiredCustomFields`: a create path that pairs customFields
 * with extended_fields (see create.ts / bulk_create.ts) must resolve that pairing first, since a
 * required linked field supplied only via extended_fields is not yet reflected in the raw request
 * customFields the required-check inspects. Callers using this run `validateRequiredCustomFields`
 * separately, after pairing, against the effective (post-pair) customFields array.
 */
export const validateCustomFieldsStructure = (params: CustomFieldValidationParams) => {
  validateDuplicatedKeysInRequest({
    requestFields: params.requestCustomFields,
    fieldName: 'customFields',
  });
  validateCustomFieldKeysAgainstConfiguration(params);
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
 * Fetches isGlobal field definitions for the given owner and returns them as
 * parsed inline fields.
 *
 * Uses the unsecured SO client directly because the `owner` has already been
 * validated by `authorization.ensureAuthorized` on the parent case operation —
 * no additional privilege check is required here.
 */
export const resolveGlobalFields = async (
  owner: string,
  fieldDefinitionsService: FieldDefinitionsService
): Promise<InlineField[]> => {
  const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(owner, {
    isGlobal: true,
  });
  return parseFieldDefinitionsToInlineFields(fieldDefinitions);
};

/**
 * True when a field definition mirrors a v1 custom field (`legacyKey`) that the owner no longer
 * has configured.
 */
const isStaleMirror = (
  fieldDefinition: FieldDefinition,
  configuredLegacyKeys: Set<string>
): boolean =>
  fieldDefinition.legacyKey !== undefined && !configuredLegacyKeys.has(fieldDefinition.legacyKey);

/**
 * Same as `resolveGlobalFields`, but drops `required` from every stale mirror — a definition
 * whose `legacyKey` points at a v1 custom field the owner no longer has configured.
 *
 * A linked definition copies the v1 field's `required` flag into its own YAML, and definitions
 * deliberately outlive the configuration that created them: deleting a configuration leaves them
 * behind (see `ensureGlobalFieldDefinitions` and the configure client). For a linked definition
 * the v1 configuration stays the authority. While the custom field is configured,
 * `validateRequiredCustomFields` enforces the flag and pairing copies the value into
 * `extended_fields`; once the configuration is gone neither runs, and pairing is skipped
 * altogether, so the copied flag becomes a requirement no caller can satisfy.
 *
 * Only `required` is dropped. The definition stays a valid global field: its key is still
 * accepted and its value is still validated.
 */
export const resolveGlobalFieldsWithoutStaleMirrorRequired = async (
  owner: string,
  fieldDefinitionsService: FieldDefinitionsService,
  customFieldsConfiguration?: CustomFieldsConfiguration
): Promise<InlineField[]> => {
  const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(owner, {
    isGlobal: true,
  });
  const configuredLegacyKeys = new Set((customFieldsConfiguration ?? []).map(({ key }) => key));

  // Parsed one definition at a time: parseFieldDefinitionsToInlineFields skips malformed
  // definitions, so its result cannot be index-aligned with its input.
  return fieldDefinitions.flatMap((fieldDefinition) => {
    const [field] = parseFieldDefinitionsToInlineFields([fieldDefinition]);
    if (field === undefined) {
      return [];
    }
    if (
      field.validation?.required !== true ||
      !isStaleMirror(fieldDefinition, configuredLegacyKeys)
    ) {
      return [field];
    }
    return [{ ...field, validation: omit(field.validation, 'required') }];
  });
};

/**
 * @deprecated Use `resolveGlobalFields` instead (returns the full InlineField array so
 * values can be validated against each field's definition).
 */
export const resolveGlobalFieldKeys = async (
  owner: string,
  fieldDefinitionsService: FieldDefinitionsService
): Promise<Set<string>> => {
  const inlineFields = await resolveGlobalFields(owner, fieldDefinitionsService);
  return new Set(inlineFields.map((f) => getFieldSnakeKey(f.name, f.type)));
};

/**
 * Enforces `required` on global (isGlobal) field definitions at case-creation time, with the
 * same semantics v1 required custom fields get from `validateRequiredCustomFields`: a required
 * field with no value and no default fails the create with a 400.
 *
 * Call after pairing (and after global-default injection): `extendedFields` must be the map
 * that will be persisted. Pairing already copies a linked customFields value — including a v1
 * configuration `defaultValue` filled by `fillMissingCustomFields` — into that map, so a
 * legacy customFields-only create that passes v1 validation also passes here. An explicit null
 * on the linked v1 field clears the v2 key, so it does not satisfy required.
 *
 * `globalFields` must come from `resolveGlobalFieldsWithoutStaleMirrorRequired`: a definition
 * that mirrors a v1 custom field the owner no longer has configured carries a stale `required`
 * flag that nothing on the create path can satisfy.
 *
 * Only required-ness is enforced here (`requiredOnly`): value validation of the request's own
 * map is handled by `validateCaseExtendedFields`.
 */
export const validateRequiredGlobalFields = ({
  globalFields,
  extendedFields,
}: {
  globalFields: InlineField[];
  extendedFields: Record<string, string>;
}): void => {
  const errors = validateExtendedFields(extendedFields, globalFields, {
    requiredOnly: true,
  });
  if (errors.length) {
    throw Boom.badRequest(`Invalid extended_fields: ${errors.join('; ')}`);
  }
};

/**
 * Shared helper that validates `extended_fields` in a case create or update request.
 *
 * - When there is no active template, only keys that correspond to `isGlobal` field
 *   definitions are permitted, and their *values* are validated against each definition.
 * - When a template is present, template-specific keys are validated against the template
 *   definition; global keys are validated against the global field definitions.
 *
 * Throws Boom.badRequest on any violation.
 */
export const validateCaseExtendedFields = async ({
  extendedFields,
  templateId,
  globalFields,
  templatesService,
  fieldDefinitionsService,
  owner,
  partial = false,
  preResolvedTemplateFields,
}: {
  extendedFields: Record<string, string>;
  templateId: string | null | undefined;
  globalFields: InlineField[];
  templatesService: TemplatesService;
  fieldDefinitionsService: FieldDefinitionsService;
  owner: string;
  /** Pass `true` for update paths where only a subset of fields may be present. */
  partial?: boolean;
  /**
   * The template's already-resolved inline fields, when the caller fetched and parsed the
   * template earlier in the same request (e.g. server-side template expansion on create) —
   * skips a duplicate SO fetch + parse.
   */
  preResolvedTemplateFields?: InlineField[];
}): Promise<void> => {
  const globalKeySet = new Set(globalFields.map((f) => getFieldSnakeKey(f.name, f.type)));

  if (!templateId) {
    // No template — only global field keys are permitted. validateExtendedFields reports any
    // other key as unknown, pointing at the exact key to use where one can be derived.
    const globalErrors = validateExtendedFields(extendedFields, globalFields, { partial });
    if (globalErrors.length) {
      throw Boom.badRequest(`Invalid extended_fields: ${globalErrors.join('; ')}`);
    }
    return;
  }

  let resolvedTemplateFields = preResolvedTemplateFields;

  if (resolvedTemplateFields === undefined) {
    const templateSO = await templatesService.getTemplate(templateId, undefined, {
      includeDeleted: true,
    });
    if (!templateSO) {
      throw Boom.badRequest(`Template ${templateId} not found`);
    }
    let parsedTemplate;
    try {
      parsedTemplate = parseTemplate(templateSO.attributes);
    } catch (err) {
      throw Boom.badRequest(`Template ${templateId} has an invalid definition`);
    }

    // Resolve $ref entries in the template definition against the field library so
    // that keys from library-referenced fields are recognised during validation.
    const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(owner);
    resolvedTemplateFields = resolveTemplateFields(
      parsedTemplate.definition.fields,
      fieldDefinitions
    );
  }

  // Validate template-specific keys against the resolved template fields. On a storage-key
  // collision the global definition is authoritative (see resolveApplicableFields), so fields
  // the template `$ref`s from the global library are excluded here — their values live under
  // global keys and are validated in the global pass below. Without this exclusion a required
  // global field referenced by the template is checked against an always-absent value and
  // wrongly fails as "required".
  const templateOnlyFields = Object.fromEntries(
    Object.entries(extendedFields).filter(([k]) => !globalKeySet.has(k))
  );
  const templateNonGlobalFields = excludeTemplateFieldsCollidingWithGlobal(
    resolvedTemplateFields,
    globalFields
  );
  const templateErrors = validateExtendedFields(templateOnlyFields, templateNonGlobalFields, {
    partial,
    hintFields: globalFields,
  });
  if (templateErrors.length) {
    throw Boom.badRequest(`Invalid extended_fields: ${templateErrors.join('; ')}`);
  }

  // Also validate global-key VALUES against their own definitions. Runs even when the request
  // carries no global keys so that non-partial (create) requests still enforce required global
  // fields — the template pass above no longer covers the ones the template `$ref`s.
  const globalOnlyFields = Object.fromEntries(
    Object.entries(extendedFields).filter(([k]) => globalKeySet.has(k))
  );
  const globalErrors = validateExtendedFields(globalOnlyFields, globalFields, { partial });
  if (globalErrors.length) {
    throw Boom.badRequest(`Invalid extended_fields: ${globalErrors.join('; ')}`);
  }
};

export const validateExtendedFieldsInRequest = async ({
  updateReq,
  originalCase,
  templatesService,
  fieldDefinitionsService,
  globalFields,
}: {
  updateReq: CasePatchRequest;
  originalCase: CaseSavedObjectTransformed;
  templatesService: TemplatesService;
  fieldDefinitionsService: FieldDefinitionsService;
  globalFields: InlineField[];
}): Promise<void> => {
  if (!updateReq.extended_fields) return;

  // null means the template is being cleared; undefined means it is not changing.
  const templateId =
    updateReq.template === null
      ? null
      : updateReq.template?.id ?? originalCase.attributes.template?.id;

  await validateCaseExtendedFields({
    extendedFields: updateReq.extended_fields,
    templateId,
    globalFields,
    templatesService,
    fieldDefinitionsService,
    owner: originalCase.attributes.owner,
    partial: true,
  });
};

/**
 * Fetches and parses a template's inline fields for use in close-time validation.
 * Returns [] if the template is not found or its definition is unparseable.
 * Callers in bulk operations should pre-resolve templates by ID+version to avoid N SO fetches.
 *
 * Pass `templateVersion` to pin validation to the version the case was created with, preventing
 * a later template edit (adding a required_on_close field) from blocking closure of older cases.
 * When omitted, falls back to the latest version.
 */
export const resolveTemplateFieldsForClose = async ({
  templateId,
  templateVersion,
  templatesService,
  fieldDefinitionsService,
  logger,
}: {
  templateId: string;
  templateVersion?: number;
  templatesService: TemplatesService;
  fieldDefinitionsService: FieldDefinitionsService;
  logger: Logger;
}): Promise<InlineField[]> => {
  const templateSO = await templatesService.getTemplate(
    templateId,
    templateVersion != null ? String(templateVersion) : undefined,
    { includeDeleted: true }
  );
  if (!templateSO) {
    return [];
  }
  try {
    const parsedTemplate = parseTemplate(templateSO.attributes);
    const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(
      templateSO.attributes.owner
    );
    return resolveTemplateFields(parsedTemplate.definition.fields, fieldDefinitions);
  } catch (err) {
    logger.warn(
      `Failed to parse template "${templateId}" definition during close validation — skipping template field enforcement: ${err}`
    );
    return [];
  }
};

/**
 * Validates that all `required_on_close` fields are filled when a case transitions to closed.
 *
 * `finalExtendedFields` must be the COMPLETE map that will be persisted for the case — not a
 * PATCH delta. The caller is responsible for producing it (post-merge and post-pairing, when
 * pairing ran). The validator never consults the original case's stored values: merging them
 * here would resurrect keys that pairing deliberately deleted (a cleared linked field) and
 * wrongly allow closing without a required field.
 *
 * Only checks fields with `required_on_close: true` — regular required fields are a write-time
 * concern and are not re-validated here. Orphaned keys from old templates are silently ignored.
 *
 * Template fields must be pre-resolved by the caller (via resolveTemplateFieldsForClose) so that
 * bulk operations can deduplicate SO fetches across cases sharing the same template.
 *
 * NOTE: We intentionally do not delegate to the common validateExtendedFields({ onClose: true })
 * here, even though that option was added in the same PR, because the common function is designed
 * for client-side real-time preview (no SO access; caller provides a flat extendedFields map),
 * whereas this function operates on the caller-provided final state.
 */
export const validateExtendedFieldsOnClose = ({
  caseId,
  requestedStatus,
  originalStatus,
  finalExtendedFields,
  templateFields,
  globalFields,
}: {
  caseId: string;
  requestedStatus: CaseStatuses | undefined;
  originalStatus: CaseStatuses;
  finalExtendedFields: Record<string, string>;
  templateFields: InlineField[];
  globalFields: InlineField[];
}): void => {
  if (requestedStatus !== CaseStatuses.closed || originalStatus === CaseStatuses.closed) {
    return;
  }

  // Same global-wins exclusion as write-time validation — template `$ref`s to global fields
  // must not be checked a second time (duplicate "Field X is required" on close).
  const allFields = [
    ...globalFields,
    ...excludeTemplateFieldsCollidingWithGlobal(templateFields, globalFields),
  ];

  // Build helper maps for condition evaluation (show_when).
  const fieldValues: Record<string, string | undefined> = {};
  const fieldTypeMap: Record<string, string> = {};
  const fieldControlMap: Record<string, string> = {};
  for (const field of allFields) {
    fieldValues[field.name] = finalExtendedFields[getFieldSnakeKey(field.name, field.type)];
    fieldTypeMap[field.name] = field.type;
    fieldControlMap[field.name] = field.control;
  }

  const isFieldVisible = (field: InlineField): boolean =>
    field.display?.show_when == null ||
    evaluateCondition(field.display.show_when, fieldValues, fieldTypeMap, fieldControlMap);

  const isFieldEmpty = (field: InlineField): boolean => {
    const value = fieldValues[field.name];
    const isArrayField =
      field.control === FieldType.CHECKBOX_GROUP || field.control === FieldType.USER_PICKER;
    return (
      value === undefined || value === null || value === '' || (isArrayField && value === '[]')
    );
  };

  const errors = allFields
    .filter(
      (field) =>
        // Display-only fields (e.g. MARKDOWN) hold no value and can never satisfy a required check.
        !isDisplayOnlyField(field) &&
        field.validation?.required_on_close === true &&
        isFieldVisible(field) &&
        isFieldEmpty(field)
    )
    .map((field) => `Field "${field.label ?? field.name}" is required`);

  if (errors.length > 0) {
    throw Boom.badRequest(
      `Cannot close case ${caseId}, required fields must be filled: ${errors.join('; ')}`
    );
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
