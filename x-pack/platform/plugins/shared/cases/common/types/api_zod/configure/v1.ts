/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_CUSTOM_FIELDS_PER_CASE,
  MAX_CUSTOM_FIELD_KEY_LENGTH,
  MAX_CUSTOM_FIELD_LABEL_LENGTH,
  MAX_CUSTOM_OBSERVABLE_TYPES,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_TYPE_LABEL_LENGTH,
  MAX_TAGS_PER_TEMPLATE,
  MAX_TEMPLATES_LENGTH,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_KEY_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_TAG_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema, regexStringSchema } from '../../../schema_zod';
import {
  CustomFieldTextTypeSchema,
  CustomFieldToggleTypeSchema,
  CustomFieldNumberTypeSchema,
} from '../../domain_zod/custom_field/v1';
import {
  ClosureTypeSchema,
  ConfigurationBasicWithoutOwnerSchema,
} from '../../domain_zod/configure/v1';
import { CaseConnectorSchema } from '../../domain_zod/connector/v1';
import { CaseBaseOptionalFieldsRequestSchema } from '../case/v1';
import {
  CaseCustomFieldTextWithValidationValueSchema,
  CaseCustomFieldNumberWithValidationValueSchema,
} from '../custom_field/v1';

export const CustomFieldConfigurationWithoutTypeSchema = z.object({
  key: regexStringSchema({
    codec: limitedStringSchema({ fieldName: 'key', min: 1, max: MAX_CUSTOM_FIELD_KEY_LENGTH }),
    pattern: '^[a-z0-9_-]+$',
    message: `Key must be lower case, a-z, 0-9, '_', and '-' are allowed`,
  }),
  label: limitedStringSchema({ fieldName: 'label', min: 1, max: MAX_CUSTOM_FIELD_LABEL_LENGTH }),
  required: z.boolean(),
});

export const TextCustomFieldConfigurationSchema = CustomFieldConfigurationWithoutTypeSchema.extend({
  type: CustomFieldTextTypeSchema,
  defaultValue: CaseCustomFieldTextWithValidationValueSchema('defaultValue').nullable().optional(),
});

export const ToggleCustomFieldConfigurationSchema =
  CustomFieldConfigurationWithoutTypeSchema.extend({
    type: CustomFieldToggleTypeSchema,
    defaultValue: z.boolean().nullable().optional(),
  });

export const NumberCustomFieldConfigurationSchema =
  CustomFieldConfigurationWithoutTypeSchema.extend({
    type: CustomFieldNumberTypeSchema,
    defaultValue: CaseCustomFieldNumberWithValidationValueSchema({ fieldName: 'defaultValue' })
      .nullable()
      .optional(),
  });

export const CustomFieldsConfigurationSchema = limitedArraySchema({
  codec: z.union([
    TextCustomFieldConfigurationSchema,
    ToggleCustomFieldConfigurationSchema,
    NumberCustomFieldConfigurationSchema,
  ]),
  min: 0,
  max: MAX_CUSTOM_FIELDS_PER_CASE,
  fieldName: 'customFields',
});

export const ObservableTypesConfigurationSchema = limitedArraySchema({
  min: 0,
  max: MAX_CUSTOM_OBSERVABLE_TYPES,
  fieldName: 'observableTypes',
  codec: z.object({
    key: regexStringSchema({
      codec: limitedStringSchema({
        fieldName: 'key',
        min: 1,
        max: MAX_OBSERVABLE_TYPE_KEY_LENGTH,
      }),
      pattern: '^[a-z0-9_-]+$',
      message: `Key must be lower case, a-z, 0-9, '_', and '-' are allowed`,
    }),
    label: limitedStringSchema({
      fieldName: 'label',
      min: 1,
      max: MAX_OBSERVABLE_TYPE_LABEL_LENGTH,
    }),
  }),
});

export const TemplateConfigurationSchema = z.object({
  key: regexStringSchema({
    codec: limitedStringSchema({ fieldName: 'key', min: 1, max: MAX_TEMPLATE_KEY_LENGTH }),
    pattern: '^[a-z0-9_-]+$',
    message: `Key must be lower case, a-z, 0-9, '_', and '-' are allowed`,
  }),
  name: limitedStringSchema({ fieldName: 'name', min: 1, max: MAX_TEMPLATE_NAME_LENGTH }),
  caseFields: CaseBaseOptionalFieldsRequestSchema.nullable(),
  description: limitedStringSchema({
    fieldName: 'description',
    min: 0,
    max: MAX_TEMPLATE_DESCRIPTION_LENGTH,
  }).optional(),
  tags: limitedArraySchema({
    codec: limitedStringSchema({
      fieldName: `template's tag`,
      min: 1,
      max: MAX_TEMPLATE_TAG_LENGTH,
    }),
    min: 0,
    max: MAX_TAGS_PER_TEMPLATE,
    fieldName: `template's tags`,
  }).optional(),
});

export const TemplatesConfigurationSchema = limitedArraySchema({
  codec: TemplateConfigurationSchema,
  min: 0,
  max: MAX_TEMPLATES_LENGTH,
  fieldName: 'templates',
});

export const ConfigurationRequestSchema = z.object({
  connector: CaseConnectorSchema,
  closure_type: ClosureTypeSchema,
  owner: z.string(),
  customFields: CustomFieldsConfigurationSchema.optional(),
  templates: TemplatesConfigurationSchema.optional(),
  observableTypes: ObservableTypesConfigurationSchema.optional(),
});

export const GetConfigurationFindRequestSchema = z.object({
  owner: z.union([z.array(z.string()), z.string()]).optional(),
});

export const CaseConfigureRequestParamsSchema = z.object({
  configuration_id: z.string(),
});

export const ConfigurationPatchRequestSchema = z.object({
  closure_type: ClosureTypeSchema.optional(),
  connector: ConfigurationBasicWithoutOwnerSchema.shape.connector.optional(),
  customFields: CustomFieldsConfigurationSchema.optional(),
  templates: TemplatesConfigurationSchema.optional(),
  observableTypes: ObservableTypesConfigurationSchema.optional(),
  version: z.string(),
});

export type ConfigurationRequest = z.infer<typeof ConfigurationRequestSchema>;
export type ConfigurationPatchRequest = z.infer<typeof ConfigurationPatchRequestSchema>;
export type GetConfigurationFindRequest = z.infer<typeof GetConfigurationFindRequestSchema>;
