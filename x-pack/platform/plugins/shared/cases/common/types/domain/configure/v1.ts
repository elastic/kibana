/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
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

export const KpiMetricIndexSchema = lazySchema(() => z.enum(['cases', 'activity', 'attachments']));

export const KpiMetricAggregationTypeSchema = lazySchema(() =>
  z.enum(['count', 'cardinality', 'sum', 'avg', 'min', 'max', 'median'])
);

export const KpiMetricDisplaySchema = lazySchema(() => z.enum(['value', 'trend']));

export const KpiMetricDateFieldSchema = lazySchema(() => z.enum(['created_at', 'closed_at']));

export const KpiMetricThresholdUnitSchema = lazySchema(() => z.enum(['m', 'h', 'd']));

export const KpiMetricThresholdSchema = lazySchema(() =>
  z.object({
    comparator: z.enum(['above', 'below']),
    value: z.number(),
    /**
     * The unit that the admin selected for a duration threshold. The value is always in seconds.
     */
    unit: KpiMetricThresholdUnitSchema.optional(),
  })
);

export const KpiMetricDirectionSchema = lazySchema(() =>
  z.enum(['lower_is_better', 'higher_is_better'])
);

const KpiMetricBaseSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    display: KpiMetricDisplaySchema,
    threshold: KpiMetricThresholdSchema.optional(),
    /**
     * Whether a lower or a higher value is good, for the comparison with the previous period
     */
    direction: KpiMetricDirectionSchema.optional(),
  })
);

export const PredefinedKpiMetricSchema = lazySchema(() =>
  KpiMetricBaseSchema.extend({
    kind: z.literal('predefined'),
    predefinedId: z.string(),
  })
);

export const CustomKpiMetricSchema = lazySchema(() =>
  KpiMetricBaseSchema.extend({
    kind: z.literal('custom'),
    label: z.string(),
    index: KpiMetricIndexSchema,
    /**
     * KQL query on the analytics index. Forced space and owner filters are added on the server.
     */
    query: z.string(),
    /**
     * The case date that the date range applies to. Only for the cases index. No value means created_at.
     */
    dateField: KpiMetricDateFieldSchema.optional(),
    /**
     * No aggregation means a count of the matching documents
     */
    aggregation: z
      .object({
        type: KpiMetricAggregationTypeSchema,
        field: z.string().optional(),
      })
      .optional(),
    /**
     * The query selects the numerator. All cases of the owner in the date range are the denominator.
     */
    percent: z.boolean().optional(),
    groupBy: z.object({ field: z.string() }).optional(),
  })
);

export const KpiMetricSchema = lazySchema(() =>
  z.discriminatedUnion('kind', [PredefinedKpiMetricSchema, CustomKpiMetricSchema])
);

export const KpiMetricsConfigurationSchema = lazySchema(() =>
  z.object({
    casesList: z.array(KpiMetricSchema).optional(),
    caseDetails: z.array(KpiMetricSchema).optional(),
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
     * KPI metrics shown on the case list and on the case details page
     */
    metrics: KpiMetricsConfigurationSchema.optional(),
  })
);

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
export type WorkflowTagsConfiguration = z.infer<typeof WorkflowTagsConfigurationSchema>;
export type KpiMetricAggregationType = z.infer<typeof KpiMetricAggregationTypeSchema>;
export type KpiMetricThreshold = z.infer<typeof KpiMetricThresholdSchema>;
export type KpiMetricThresholdUnit = z.infer<typeof KpiMetricThresholdUnitSchema>;
export type KpiMetricDirection = z.infer<typeof KpiMetricDirectionSchema>;
export type KpiMetricDateField = z.infer<typeof KpiMetricDateFieldSchema>;
export type PredefinedKpiMetricConfiguration = z.infer<typeof PredefinedKpiMetricSchema>;
export type CustomKpiMetricConfiguration = z.infer<typeof CustomKpiMetricSchema>;
export type KpiMetricConfiguration = z.infer<typeof KpiMetricSchema>;
export type KpiMetricsConfiguration = z.infer<typeof KpiMetricsConfigurationSchema>;
