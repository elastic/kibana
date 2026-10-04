/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SUPPORTED_FIELD_TYPES = [
  'keyword',
  'constant_keyword',
  'wildcard',
  'text',
  'match_only_text',
  'byte',
  'short',
  'integer',
  'long',
  'unsigned_long',
  'half_float',
  'float',
  'double',
  'date',
  'date_nanos',
  'boolean',
  'ip',
  'version',
] as const;

export type SupportedFieldType = (typeof SUPPORTED_FIELD_TYPES)[number];

export const MAX_FIELD_TYPE_OVERRIDES = 1000;
export const MAX_FIELD_NAME_LENGTH = 1024;
export const MAX_FIELD_TYPE_LENGTH = 1024;

export const isSupportedFieldType = (type: string): type is SupportedFieldType =>
  SUPPORTED_FIELD_TYPES.some((supportedType) => supportedType === type);

export type FieldTypeIssue =
  | 'object_value'
  | 'multiple_constant_values'
  | 'out_of_range'
  | 'negative_value'
  | 'not_numeric'
  | 'not_boolean'
  | 'not_ip';

export interface FieldTypeCompatibility {
  status: 'compatible' | 'certain_failure';
  issue?: FieldTypeIssue;
  /** Documents that have the reported issue. */
  failingDocuments: number;
  /** Documents that have a value for the field. */
  totalDocuments: number;
}

type ValueIssue = FieldTypeIssue | undefined;

const INTEGER_RANGES: Readonly<Record<string, readonly [bigint, bigint]>> = {
  byte: [-128n, 127n],
  short: [-32768n, 32767n],
  integer: [-2147483648n, 2147483647n],
  long: [-(2n ** 63n), 2n ** 63n - 1n],
};

const UNSIGNED_LONG_MAX = 2n ** 64n - 1n;

const FLOAT_MAXIMUMS: Readonly<Record<string, number>> = {
  half_float: 65504,
  float: 3.4028234663852886e38,
  double: Number.MAX_VALUE,
};

const IPV4_PATTERN = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6_PATTERN = /^[0-9a-fA-F:.]+(%[\w.]+)?$/;

const isIp = (value: string): boolean =>
  IPV4_PATTERN.test(value) || (value.includes(':') && IPV6_PATTERN.test(value));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const toInteger = (value: unknown): bigint | undefined => {
  if (typeof value === 'number') return Number.isInteger(value) ? BigInt(value) : undefined;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return BigInt(value.trim());
  return undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

const findValueIssue = (type: string, value: unknown): ValueIssue => {
  if (isPlainObject(value)) return 'object_value';

  if (type in INTEGER_RANGES || type === 'unsigned_long' || type in FLOAT_MAXIMUMS) {
    if (toNumber(value) === undefined) return 'not_numeric';
  }

  if (type in INTEGER_RANGES) {
    const integer = toInteger(value);
    if (integer === undefined) return undefined;
    const [minimum, maximum] = INTEGER_RANGES[type];
    return integer < minimum || integer > maximum ? 'out_of_range' : undefined;
  }

  if (type === 'unsigned_long') {
    const integer = toInteger(value);
    if (integer === undefined) return undefined;
    if (integer < 0n) return 'negative_value';
    return integer > UNSIGNED_LONG_MAX ? 'out_of_range' : undefined;
  }

  if (type in FLOAT_MAXIMUMS) {
    return Math.abs(Number(value)) > FLOAT_MAXIMUMS[type] ? 'out_of_range' : undefined;
  }

  if (type === 'boolean') {
    const isBoolean =
      typeof value === 'boolean' || value === 'true' || value === 'false' || value === '';
    return isBoolean ? undefined : 'not_boolean';
  }

  if (type === 'ip') {
    return typeof value === 'string' && isIp(value) ? undefined : 'not_ip';
  }

  return undefined;
};

const getPopulatedValues = (documentValue: unknown): unknown[] => {
  const values = Array.isArray(documentValue) ? documentValue.flat(Infinity) : [documentValue];
  return values.filter((value) => value !== undefined && value !== null);
};

/**
 * Predicts whether sample values will definitely fail to index as the given field type. Only
 * clear failures (objects, out-of-range numbers, a non-constant `constant_keyword`) are reported.
 * `documentValues` holds one entry per sample document (a value, an array of values, or undefined).
 */
export const getFieldTypeCompatibility = (
  type: string,
  documentValues: readonly unknown[]
): FieldTypeCompatibility => {
  const populatedDocuments = documentValues
    .map(getPopulatedValues)
    .filter((values) => values.length > 0);
  const totalDocuments = populatedDocuments.length;

  const documentIssues = populatedDocuments.map((values) => {
    for (const value of values) {
      const issue = findValueIssue(type, value);
      if (issue) return issue;
    }
    return undefined;
  });
  const issue = documentIssues.find(Boolean);
  if (issue) {
    return {
      status: 'certain_failure',
      issue,
      failingDocuments: documentIssues.filter(Boolean).length,
      totalDocuments,
    };
  }

  if (type === 'constant_keyword' && totalDocuments > 0) {
    const [firstValue] = populatedDocuments[0].map(String);
    const failingDocuments = populatedDocuments.filter((values) =>
      values.some((value) => String(value) !== firstValue)
    ).length;
    if (failingDocuments > 0) {
      return {
        status: 'certain_failure',
        issue: 'multiple_constant_values',
        failingDocuments,
        totalDocuments,
      };
    }
  }

  return { status: 'compatible', failingDocuments: 0, totalDocuments };
};

/**
 * Reads a field from a document by its flattened name, supporting both nested objects and
 * keys that themselves contain dots.
 */
export const getFieldValue = (document: Record<string, unknown>, fieldName: string): unknown => {
  if (Object.prototype.hasOwnProperty.call(document, fieldName)) {
    return document[fieldName];
  }

  const segments = fieldName.split('.');
  let value: unknown = document;
  let index = 0;

  while (index < segments.length) {
    if (!isPlainObject(value)) return undefined;
    const objectValue = value;
    let matched = false;

    for (let end = segments.length; end > index; end -= 1) {
      const candidate = segments.slice(index, end).join('.');
      if (Object.prototype.hasOwnProperty.call(objectValue, candidate)) {
        value = objectValue[candidate];
        index = end;
        matched = true;
        break;
      }
    }

    if (!matched) return undefined;
  }

  return value;
};
