/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryVarsEntry } from '@kbn/fleet-plugin/common';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

export const AWS_REGION_OPTIONS = [
  'ap-southeast-1',
  'ap-southeast-2',
  'eu-west-1',
  'eu-west-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
].map((r) => ({ label: r }));

export interface FieldMeta {
  def: RegistryVarsEntry;
  isBool: boolean;
  multi: boolean;
  /** Whether the manifest marks this var as user-visible (show_user: true). */
  showUser: boolean;
}

/**
 * ECF trigger vars are `multi: false` in the upstream package manifest, but ECF can route
 * multiple sources per service. We override `multi: true` so the flyout renders an "Add row"
 * list and buildStreamVars emits a string array.
 *
 * TODO: remove this override once elastic/integrations sets `multi: true` for these vars
 * in all AWS package data streams that ECF services use.
 */
export const ECF_TRIGGER_VAR_NAMES = new Set(['bucket_arn', 'log_group_arn']);

/**
 * Resolve display metadata for a var from the package manifest.
 *
 * Mirrors Fleet's positional scoping: scope is determined by which input's bucket the var sits in,
 * not by a field on the var entry. When `activeInput` is non-null the lookup is direct
 * (varDefsByInput[activeInput][fieldName]); when null, the first match across all inputs is used
 * (for services with a single input or when no input is in scope yet).
 */
export function resolveFieldMeta(
  service: AwsServiceMatrixEntry,
  activeInput: string | null,
  fieldName: string
): FieldMeta | undefined {
  const varDefsByInput = service.varDefsByInput;
  if (!varDefsByInput) return undefined;

  let def: RegistryVarsEntry | undefined;
  if (activeInput !== null) {
    def = varDefsByInput[activeInput]?.[fieldName];
  } else {
    for (const byName of Object.values(varDefsByInput)) {
      if (fieldName in byName) {
        def = byName[fieldName];
        break;
      }
    }
  }
  if (!def) return undefined;

  return {
    def,
    isBool: def.type === 'bool',
    multi: def.multi === true || ECF_TRIGGER_VAR_NAMES.has(fieldName),
    showUser: def.show_user === true,
  };
}

/**
 * Convert a string draft value to the typed value Fleet's component and buildStreamVars expect.
 * bool → boolean, multi → string[], otherwise string.
 */
export function toTyped(raw: string | undefined, meta: FieldMeta): string | boolean | string[] {
  if (meta.isBool) return raw === undefined ? meta.def.default === true : raw === 'true';
  if (meta.multi) {
    if (raw)
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (raw === undefined && Array.isArray(meta.def.default)) return meta.def.default as string[];
    return [];
  }
  // For unset fields, surface the manifest default (string or number/duration) so the flyout pre-fills.
  if (raw === undefined && meta.def.default != null) return String(meta.def.default);
  return raw ?? '';
}

/**
 * Convert Fleet's typed onChange value back to the stringly-typed draft.
 */
export function toDraft(value: unknown): string {
  if (Array.isArray(value)) return value.join(',');
  return value === undefined || value === null ? '' : String(value);
}

export function hasInputChoice(service: AwsServiceMatrixEntry): boolean {
  return (service.inputs ?? []).length >= 2;
}

/** Returns the single input to check field visibility against when the flyout has no toggle. */
export function getDefaultInput(service: AwsServiceMatrixEntry | undefined): string | null {
  // Use the first manifest-enabled input; fall back to the first available input.
  return service?.defaultEnabledInputs?.[0] ?? service?.inputs?.[0] ?? null;
}

// TODO: add the "Create dedicated index template for custom dataset (recommended)" switch
// that Fleet shows in advanced options for input packages when data_stream.dataset is customised
// (package_policy_input_stream.tsx, rendered after advancedVars when showPipelinesAndMappings is true).
// It is a Fleet UI construct, not a manifest var — needs Fleet's useIndexTemplateExists hook.
export function getFlyoutFields(
  service: AwsServiceMatrixEntry,
  activeInput: string | null
): string[] {
  const allFields = [...(service.requiredConfig ?? []), ...(service.optionalConfig ?? [])];
  return allFields.filter((f) => {
    const meta = resolveFieldMeta(service, activeInput, f);
    if (!meta) return false;
    // Bool fields are rendered as switches in their own section; exclude from text flyout fields.
    if (meta.isBool) return false;
    // show_user:false vars intentionally surface here (under Advanced options via isAdvancedVar)
    // to match the Integrations UI which shows all vars regardless of show_user.
    return true;
  });
}

export const REGION_FIELD_NAMES = new Set(['region', 'region_name', 'aws_region']);

function hasConfigurableFlyoutFieldsForInput(
  service: AwsServiceMatrixEntry,
  activeInput: string | null
): boolean {
  if (getRequiredTextFields(service, activeInput).length > 0) return true;
  if (getRequiredBooleanFields(service, activeInput).length > 0) return true;
  const flyoutFields = getFlyoutFields(service, activeInput);
  const requiredSet = new Set(getRequiredTextFields(service, activeInput));
  return flyoutFields.some((f) => !REGION_FIELD_NAMES.has(f) && !requiredSet.has(f));
}

/** Returns true when the flyout has at least one visible field for the given service. */
export function hasConfigurableFlyoutFields(service: AwsServiceMatrixEntry): boolean {
  const allInputs = service.inputs;
  if (!allInputs || allInputs.length === 0) {
    return hasConfigurableFlyoutFieldsForInput(service, getDefaultInput(service));
  }
  return allInputs.some((input) => hasConfigurableFlyoutFieldsForInput(service, input));
}

export function getRegionFieldName(
  service: AwsServiceMatrixEntry,
  activeInput: string | null
): string {
  const rc = service.requiredConfig ?? [];
  if (activeInput === 'aws-s3' && rc.includes('region')) return 'region';
  if (activeInput === 'aws-cloudwatch' && rc.includes('region_name')) return 'region_name';
  if (rc.includes('aws_region')) return 'aws_region';
  if (rc.includes('region')) return 'region'; // input packages (e.g. otelcol)
  return 'aws_region';
}

export function getRequiredTextFields(
  service: AwsServiceMatrixEntry,
  activeInput: string | null
): string[] {
  return (service.requiredConfig ?? []).filter((f) => {
    const meta = resolveFieldMeta(service, activeInput, f);
    if (!meta) return false;
    if (!meta.showUser) return false;
    if (meta.isBool) return false;
    if (REGION_FIELD_NAMES.has(f)) return false;
    return true;
  });
}

/**
 * Mirrors Fleet's isAdvancedVar logic: a var is shown by default when show_user is true,
 * or when it is required and has no default. Everything else goes behind "Advanced options".
 */
export function isAdvancedVar(def: RegistryVarsEntry): boolean {
  if (def.show_user || (def.required && def.default === undefined)) {
    return false;
  }
  return true;
}

export function getRequiredBooleanFields(
  service: AwsServiceMatrixEntry,
  activeInput: string | null
): string[] {
  return (service.requiredConfig ?? []).filter((f) => {
    const meta = resolveFieldMeta(service, activeInput, f);
    if (!meta) return false;
    if (!meta.showUser) return false;
    if (!meta.isBool) return false;
    return true;
  });
}
