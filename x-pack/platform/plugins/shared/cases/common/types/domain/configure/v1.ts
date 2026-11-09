/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  CaseConnectorSchema,
  ConnectorMappingsSchema,
  ConnectorSyncSettingsSchema,
} from '../connector/v1';
import { UserSchema } from '../user/v1';
import {
  CustomFieldTextTypeSchema,
  CustomFieldToggleTypeSchema,
  CustomFieldNumberTypeSchema,
} from '../custom_field/v1';
import { CaseBaseOptionalFieldsSchema, CaseStatusSchema } from '../case/v1';
import { CaseObservableTypeSchema } from '../observable/v1';

export const ClosureTypeSchema = z.union([
  z.literal('close-by-user'),
  z.literal('close-by-pushing'),
]);

export const CustomFieldConfigurationWithoutTypeSchema = z.object({
  /**
   * key of custom field
   */
  key: z.string(),
  /**
   * label of custom field
   */
  label: z.string(),
  /**
   * custom field options - required
   */
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

export const WorkflowTagsConfigurationSchema = z.array(z.string());

export const TemplateConfigurationSchema = z.object({
  /**
   * key of template
   */
  key: z.string(),
  /**
   * name of template
   */
  name: z.string(),
  /**
   * case fields of template
   */
  caseFields: CaseBaseOptionalFieldsSchema.nullable(),
  /**
   * description of template
   */
  description: z.string().optional(),
  /**
   * tags of template
   */
  tags: z.array(z.string()).optional(),
});

export const TemplatesConfigurationSchema = z.array(TemplateConfigurationSchema);

export const CaseStatusConfigurationSchema = lazySchema(() =>
  z.object({
    /**
     * Immutable identifier; the built-in entries use the `CaseStatuses` values as keys
     */
    key: z.string(),
    label: z.string(),
    /**
     * The built-in status this entry belongs to. Drives every status-dependent behavior.
     */
    category: CaseStatusSchema,
    order: z.number(),
    /**
     * Target of writes that only specify the category (legacy clients, close-by-pushing, connectors)
     */
    isDefault: z.boolean(),
    disabled: z.boolean(),
    /**
     * Time spent in this status is left out of the case's duration and time-to metrics
     */
    pausesTimeTracking: z.boolean().optional(),
  })
);

export const CaseStatusesConfigurationSchema = lazySchema(() =>
  z.array(CaseStatusConfigurationSchema)
);

/**
 * Close reason settings. `source` picks the reasons the close modal offers: the alert close
 * reasons, the case-defined `values`, or both.
 */
export const CloseReasonConfigurationSchema = lazySchema(() =>
  z.object({
    show: z.boolean(),
    source: z.enum(['alerts', 'cases', 'both']),
    values: z.array(z.string().min(1).max(256)).max(50).optional(),
  })
);

/**
 * Whether closed cases publish their outcome to the context engine's `cases-outcomes` AI index.
 * Missing means on.
 */
export const KnowledgeConfigurationSchema = lazySchema(() =>
  z.object({
    publishOutcomes: z.boolean(),
  })
);

export const ConfigurationBasicWithoutOwnerSchema = lazySchema(() =>
  z.object({
    /**
     * The external connector
     */
    connector: CaseConnectorSchema,
    /**
     * Whether to close the case after it has been synced with the external system
     */
    closure_type: ClosureTypeSchema,
    /**
     * The custom fields configured for the case
     */
    customFields: CustomFieldsConfigurationSchema,
    /**
     * Templates configured for the case
     */
    templates: TemplatesConfigurationSchema,
    /**
     * Observable types configured for the case
     */
    observableTypes: ObservableTypesConfigurationSchema,
    /**
     * Whether to extract observables from the case
     */
    extractObservables: z.boolean(),
    /**
     * Tags used to filter workflows available in Cases workflow selectors.
     * An empty array shows all workflows.
     */
    workflowTags: WorkflowTagsConfigurationSchema,
    /**
     * Statuses configured for the case. Empty means the three built-in statuses.
     */
    statuses: CaseStatusesConfigurationSchema,
    /**
     * Reasons an analyst picks from when moving a case to a status that pauses time tracking
     */
    pauseReasons: z.array(z.string()),
    /**
     * Whether closing a case asks for a close reason, and which reasons it offers. Filled with the
     * owner's default on read when it was never saved.
     */
    closeReason: CloseReasonConfigurationSchema.optional(),
    /**
     * Whether closed cases publish their outcome to the context engine. Filled with the default
     * (on) on read when it was never saved.
     */
    knowledge: KnowledgeConfigurationSchema.optional(),
  })
);

export type KnowledgeConfiguration = z.infer<typeof KnowledgeConfigurationSchema>;
export type CloseReasonConfiguration = z.infer<typeof CloseReasonConfigurationSchema>;

export const CasesConfigureBasicSchema = ConfigurationBasicWithoutOwnerSchema.extend({
  /**
   * The plugin owner that manages this configuration
   */
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

/**
 * Sync settings of the configuration's connector (technical preview). Stored on the
 * connector mappings, surfaced on the configuration for the settings page.
 */
export const ConfigurationSchema = lazySchema(() =>
  ConfigurationAttributesSchema.extend({
    id: z.string(),
    version: z.string(),
    error: z.string().nullable(),
    owner: z.string(),
    mappings: ConnectorMappingsSchema,
  }).merge(ConnectorSyncSettingsSchema)
);

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
export type WorkflowTagsConfiguration = z.infer<typeof WorkflowTagsConfigurationSchema>;
export type CaseStatusConfiguration = z.infer<typeof CaseStatusConfigurationSchema>;
export type CaseStatusesConfiguration = z.infer<typeof CaseStatusesConfigurationSchema>;
