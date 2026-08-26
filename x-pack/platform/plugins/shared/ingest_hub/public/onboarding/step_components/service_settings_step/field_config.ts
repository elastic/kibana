/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryVarsEntry } from '@kbn/fleet-plugin/common';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

export type TransportType = 'aws-s3' | 'aws-cloudwatch';

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
  /** Undefined when the var appears under both inputs — then it always renders. */
  transport?: TransportType;
  isBool: boolean;
  multi: boolean;
  /** Whether the manifest marks this var as user-visible (show_user: true). */
  showUser: boolean;
}

const TRANSPORT_TYPES: TransportType[] = ['aws-s3', 'aws-cloudwatch'];

/** Resolve display metadata for a var straight from the package manifest. */
export function resolveFieldMeta(
  service: AwsServiceMatrixEntry,
  fieldName: string
): FieldMeta | undefined {
  const vd = service.varDefs?.[fieldName];
  if (!vd) return undefined;
  // A var scoped to exactly one transport renders only for that transport.
  // Vars shared by both inputs get no transport filter and always render.
  const transport =
    vd.inputs.length === 1 ? TRANSPORT_TYPES.find((t) => t === vd.inputs[0]) : undefined;
  return {
    def: vd.def,
    transport,
    isBool: vd.def.type === 'bool',
    multi: vd.def.multi === true,
    showUser: vd.def.show_user === true,
  };
}

/**
 * Convert a string draft value to the typed value Fleet's component and buildStreamVars expect.
 * bool → boolean, multi → string[], otherwise string.
 */
export function toTyped(raw: string | undefined, meta: FieldMeta): string | boolean | string[] {
  if (meta.isBool) return raw === undefined ? meta.def.default === true : raw === 'true';
  if (meta.multi)
    return raw
      ? raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  // For unset text/duration/etc fields, surface the manifest default so the flyout pre-fills.
  if (raw === undefined && typeof meta.def.default === 'string') return meta.def.default;
  return raw ?? '';
}

/**
 * Convert Fleet's typed onChange value back to the stringly-typed draft.
 */
export function toDraft(value: unknown): string {
  if (Array.isArray(value)) return value.join(',');
  return value === undefined || value === null ? '' : String(value);
}

export function hasTransportChoice(service: AwsServiceMatrixEntry): boolean {
  const inputs = service.inputs ?? [];
  return inputs.includes('aws-s3') && inputs.includes('aws-cloudwatch');
}

export function getDefaultTransport(
  service: AwsServiceMatrixEntry | undefined
): TransportType | null {
  const inputs = service?.inputs ?? [];
  if (inputs.includes('aws-s3')) return 'aws-s3';
  if (inputs.includes('aws-cloudwatch')) return 'aws-cloudwatch';
  return null;
}

export function getFlyoutFields(
  service: AwsServiceMatrixEntry,
  activeTransport: TransportType | null
): string[] {
  const allFields = [...(service.requiredConfig ?? []), ...(service.optionalConfig ?? [])];
  return allFields.filter((f) => {
    const meta = resolveFieldMeta(service, f);
    if (!meta) return false;
    if (!meta.showUser) return false;
    // Bool fields are rendered as switches in their own section; exclude from text flyout fields.
    if (meta.isBool) return false;
    if (meta.transport && activeTransport && meta.transport !== activeTransport) return false;
    return true;
  });
}

export const REGION_FIELD_NAMES = new Set(['region', 'region_name', 'aws_region']);

/** Returns true when the flyout has at least one visible field for the given service. */
export function hasConfigurableFlyoutFields(service: AwsServiceMatrixEntry): boolean {
  if (hasTransportChoice(service)) return true;
  const defaultTransport = getDefaultTransport(service);
  if (getRequiredTextFields(service, defaultTransport).length > 0) return true;
  if (getRequiredBooleanFields(service, defaultTransport).length > 0) return true;
  const flyoutFields = getFlyoutFields(service, defaultTransport);
  const requiredSet = new Set(getRequiredTextFields(service, defaultTransport));
  return flyoutFields.some((f) => !REGION_FIELD_NAMES.has(f) && !requiredSet.has(f));
}

export function getRegionFieldName(
  service: AwsServiceMatrixEntry,
  activeTransport: string | null
): string {
  const rc = service.requiredConfig ?? [];
  if (activeTransport === 'aws-s3' && rc.includes('region')) return 'region';
  if (activeTransport === 'aws-cloudwatch' && rc.includes('region_name')) return 'region_name';
  if (rc.includes('aws_region')) return 'aws_region';
  return 'aws_region';
}

export function getRequiredTextFields(
  service: AwsServiceMatrixEntry,
  activeTransport: TransportType | null
): string[] {
  return (service.requiredConfig ?? []).filter((f) => {
    const meta = resolveFieldMeta(service, f);
    if (!meta) return false;
    if (!meta.showUser) return false;
    if (meta.isBool) return false;
    if (REGION_FIELD_NAMES.has(f)) return false;
    if (meta.transport && activeTransport && meta.transport !== activeTransport) return false;
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
  activeTransport: TransportType | null
): string[] {
  return (service.requiredConfig ?? []).filter((f) => {
    const meta = resolveFieldMeta(service, f);
    if (!meta) return false;
    if (!meta.showUser) return false;
    if (!meta.isBool) return false;
    if (meta.transport && activeTransport && meta.transport !== activeTransport) return false;
    return true;
  });
}
