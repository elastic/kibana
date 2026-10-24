/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type CatalogueSignal = 'logs' | 'metrics' | 'traces' | 'docs' | 'profiles';

export type CatalogueComponentKind = 'source' | 'processor' | 'destination';

export type CatalogueComponentStatus = 'stable' | 'beta' | 'experimental' | 'deprecated';

export type CatalogueTelemetrySelection = 'configurable' | 'fixed';

export type CatalogueLiteralValue =
  | null
  | boolean
  | number
  | string
  | CatalogueLiteralValue[]
  | { [key: string]: CatalogueLiteralValue };

export type CatalogueValueKind =
  | 'any'
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'null'
  | 'array'
  | 'object';

export type CatalogueLiteralKind = Exclude<CatalogueValueKind, 'any'>;

export type CatalogueStringFormat =
  | 'hostname'
  | 'url'
  | 'uri'
  | 'email'
  | 'duration'
  | 'regex'
  | 'grok'
  | 'ottl_statement'
  | 'ottl_value'
  | 'ottl_condition';

export interface CatalogueComponentSummary {
  type: string;
  kind: CatalogueComponentKind;
  display_name: string;
  description?: string;
  supported_telemetry: CatalogueSignal[];
  telemetry_selection: CatalogueTelemetrySelection;
  status?: CatalogueComponentStatus;
}

export interface CatalogueEnumOption {
  value: string | number;
  label?: string;
  description?: string;
  supported_telemetry?: CatalogueSignal[];
  disabled?: boolean;
}

export interface CatalogueEnumSet {
  options: CatalogueEnumOption[];
}

export interface CataloguePathOption {
  path: string;
  value_kind?: CatalogueValueKind;
  description?: string;
  supported_telemetry?: CatalogueSignal[];
}

export interface CataloguePathSet {
  contexts: Record<string, CataloguePathOption[]>;
  locations: Record<string, CataloguePathOption[]>;
}

export interface CatalogueMetadata {
  schema_version: string;
  enum_sets: Record<string, CatalogueEnumSet>;
  path_sets: Record<string, CataloguePathSet>;
}

export type CatalogueComparisonOperator = 'eq' | 'neq' | 'exists' | 'contains';

export interface CatalogueComparisonCondition {
  /** JSON pointer, resolved against the object that contains the field. */
  path: string;
  operator: CatalogueComparisonOperator;
  value?: CatalogueLiteralValue;
}

export type CatalogueCondition =
  | CatalogueComparisonCondition
  | { all: CatalogueCondition[] }
  | { any: CatalogueCondition[] }
  | { not: CatalogueCondition }
  | { telemetry_contains: CatalogueSignal };

export type CatalogueUiWidth = 'xs' | 's' | 'm' | 'l' | 'xl' | 'full';

export interface CatalogueUiHints {
  group?: string;
  row?: string;
  order?: number;
  placeholder?: string;
  multiline?: boolean;
  lines?: number;
  width?: CatalogueUiWidth;
}

interface CatalogueFieldBase {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  required_when?: CatalogueCondition;
  available_when?: CatalogueCondition;
  ui?: CatalogueUiHints;
}

export interface CatalogueStringField extends CatalogueFieldBase {
  type: 'string';
  default?: string;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  format?: CatalogueStringFormat;
}

export interface CatalogueIntegerField extends CatalogueFieldBase {
  type: 'integer';
  default?: number;
  minimum?: number;
  maximum?: number;
}

export interface CatalogueNumberField extends CatalogueFieldBase {
  type: 'number';
  default?: number;
  minimum?: number;
  maximum?: number;
}

export interface CatalogueBooleanField extends CatalogueFieldBase {
  type: 'boolean';
  default?: boolean;
}

export interface CatalogueLiteralField extends CatalogueFieldBase {
  type: 'literal';
  default?: CatalogueLiteralValue;
  literal_kinds?: CatalogueLiteralKind[];
}

export interface CatalogueEnumField extends CatalogueFieldBase {
  type: 'enum';
  default?: string | number;
  options?: CatalogueEnumOption[];
  enum_set?: string;
}

export interface CatalogueChoiceGroup {
  id: string;
  label?: string;
  fields: string[];
  min_selected: 0 | 1;
  max_selected: 1;
  default_field?: string;
}

export interface CatalogueObjectField extends CatalogueFieldBase {
  type: 'object';
  default?: { [key: string]: CatalogueLiteralValue };
  fields: CatalogueNamedFieldDefinition[];
  choice_groups?: CatalogueChoiceGroup[];
  allow_additional_fields?: boolean;
}

export interface CatalogueArrayField extends CatalogueFieldBase {
  type: 'array';
  default?: CatalogueLiteralValue[];
  items: CatalogueFieldDefinition;
  allow_item_telemetry?: boolean;
  min_items?: number;
  max_items?: number;
  unique_items?: boolean;
}

export interface CatalogueMapField extends CatalogueFieldBase {
  type: 'map';
  default?: { [key: string]: CatalogueLiteralValue };
  key_pattern?: string;
  value_schema: CatalogueFieldDefinition;
  min_entries?: number;
  max_entries?: number;
}

export interface CatalogueSecretField extends CatalogueFieldBase {
  type: 'secret';
  default?: string;
}

export interface CatalogueComponentReferenceField extends CatalogueFieldBase {
  type: 'component_reference';
  default?: string | string[];
  component_kinds: Array<Exclude<CatalogueComponentKind, 'source'>>;
  multiple?: boolean;
}

export interface CataloguePathField extends CatalogueFieldBase {
  type: 'path';
  default?: string;
  path_set?: string;
}

export type CatalogueFieldDefinition =
  | CatalogueStringField
  | CatalogueIntegerField
  | CatalogueNumberField
  | CatalogueBooleanField
  | CatalogueLiteralField
  | CatalogueEnumField
  | CatalogueObjectField
  | CatalogueArrayField
  | CatalogueMapField
  | CatalogueSecretField
  | CatalogueComponentReferenceField
  | CataloguePathField;

export type CatalogueFieldType = CatalogueFieldDefinition['type'];

export type CatalogueNamedFieldDefinition = CatalogueFieldDefinition & { name: string };

export interface CatalogueFieldGroup {
  id: string;
  label: string;
  order?: number;
  advanced?: boolean;
}

export interface CatalogueHelpContent {
  summary?: string;
  details?: string;
  documentation?: string;
}

export interface CatalogueComponentDefinition {
  kind: CatalogueComponentKind;
  type: string;
  schema_version: string;
  display_name: string;
  description?: string;
  supported_telemetry: CatalogueSignal[];
  telemetry_selection: CatalogueTelemetrySelection;
  status?: CatalogueComponentStatus;
  fields: CatalogueNamedFieldDefinition[];
  groups?: CatalogueFieldGroup[];
  help?: CatalogueHelpContent;
}

export interface ComponentCatalogue {
  schema_version: string;
  component_revision: string;
  components: CatalogueComponentSummary[];
  metadata: CatalogueMetadata;
  definitions: CatalogueComponentDefinition[];
}
