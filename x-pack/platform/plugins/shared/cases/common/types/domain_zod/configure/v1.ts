/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CaseConnectorSchema, ConnectorMappingsSchema } from '../connector/v1';
import { UserSchema } from '../user/v1';
import {
  CustomFieldTextTypeSchema,
  CustomFieldToggleTypeSchema,
  CustomFieldNumberTypeSchema,
} from '../custom_field/v1';
import { CaseBaseOptionalFieldsSchema } from '../case/v1';
import { CaseObservableTypeSchema } from '../observable/v1';

export const ClosureTypeSchema = z.union([
  z.literal('close-by-user'),
  z.literal('close-by-pushing'),
]);

export const CustomFieldConfigurationWithoutTypeSchema = z.object({
  key: z.string(),
  label: z.string(),
  required: z.boolean(),
});

export const TextCustomFieldConfigurationSchema = CustomFieldConfigurationWithoutTypeSchema.extend({
  type: CustomFieldTextTypeSchema,
  defaultValue: z.string().nullable().optional(),
});

export const ToggleCustomFieldConfigurationSchema =
  CustomFieldConfigurationWithoutTypeSchema.extend({
    type: CustomFieldToggleTypeSchema,
    defaultValue: z.boolean().nullable().optional(),
  });

export const NumberCustomFieldConfigurationSchema =
  CustomFieldConfigurationWithoutTypeSchema.extend({
    type: CustomFieldNumberTypeSchema,
    defaultValue: z.number().nullable().optional(),
  });

export const CustomFieldConfigurationSchema = z.union([
  TextCustomFieldConfigurationSchema,
  ToggleCustomFieldConfigurationSchema,
  NumberCustomFieldConfigurationSchema,
]);

export const CustomFieldsConfigurationSchema = z.array(CustomFieldConfigurationSchema);

export const ObservableTypesConfigurationSchema = z.array(CaseObservableTypeSchema);

export const TemplateConfigurationSchema = z.object({
  key: z.string(),
  name: z.string(),
  caseFields: CaseBaseOptionalFieldsSchema.nullable(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const TemplatesConfigurationSchema = z.array(TemplateConfigurationSchema);

export const ConfigurationBasicWithoutOwnerSchema = z.object({
  connector: CaseConnectorSchema,
  closure_type: ClosureTypeSchema,
  customFields: CustomFieldsConfigurationSchema,
  templates: TemplatesConfigurationSchema,
  observableTypes: ObservableTypesConfigurationSchema,
});

export const CasesConfigureBasicSchema = ConfigurationBasicWithoutOwnerSchema.extend({
  owner: z.string(),
});

export const ConfigurationActivityFieldsSchema = z.object({
  created_at: z.string(),
  created_by: UserSchema,
  updated_at: z.string().nullable(),
  updated_by: UserSchema.nullable(),
});

export const ConfigurationAttributesSchema = CasesConfigureBasicSchema.merge(
  ConfigurationActivityFieldsSchema
);

export const ConfigurationSchema = ConfigurationAttributesSchema.extend({
  id: z.string(),
  version: z.string(),
  error: z.string().nullable(),
  owner: z.string(),
  mappings: ConnectorMappingsSchema,
});

export const ConfigurationsSchema = z.array(ConfigurationSchema);

export type CustomFieldsConfiguration = z.infer<typeof CustomFieldsConfigurationSchema>;
export type CustomFieldConfiguration = z.infer<typeof CustomFieldConfigurationSchema>;
export type TemplatesConfiguration = z.infer<typeof TemplatesConfigurationSchema>;
export type TemplateConfiguration = z.infer<typeof TemplateConfigurationSchema>;
export type ClosureType = z.infer<typeof ClosureTypeSchema>;
export type ConfigurationAttributes = z.infer<typeof ConfigurationAttributesSchema>;
export type Configuration = z.infer<typeof ConfigurationSchema>;
export type Configurations = z.infer<typeof ConfigurationsSchema>;
export type ObservableTypesConfiguration = z.infer<typeof ObservableTypesConfigurationSchema>;
export type ObservableTypeConfiguration = z.infer<typeof CaseObservableTypeSchema>;
