/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo, FieldValue } from '@elastic/elasticsearch/lib/api/types';

/** An ES|QL cell: multi-valued fields are arrays, `flattened` columns are objects. */
export type EsqlCellValue = FieldValue | EsqlCellValue[] | EsqlCellRecord;

export interface EsqlCellRecord {
  [key: string]: EsqlCellValue;
}

const isCellRecord = (value: EsqlCellValue | undefined): value is EsqlCellRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const firstValue = (value: EsqlCellValue | undefined): EsqlCellValue | undefined =>
  Array.isArray(value) ? firstValue(value[0]) : value;

export const toEsqlRecords = (
  columns: readonly EsqlEsqlColumnInfo[],
  values: readonly (readonly EsqlCellValue[])[]
): EsqlCellRecord[] =>
  values.map((row) =>
    Object.fromEntries(columns.map(({ name }, index) => [name, row[index] ?? null]))
  );

export const getString = (value: EsqlCellValue | undefined): string | undefined => {
  const scalar = firstValue(value);
  return typeof scalar === 'string' && scalar.length > 0 ? scalar : undefined;
};

export const getNumber = (value: EsqlCellValue | undefined): number | undefined => {
  const scalar = firstValue(value);
  if (typeof scalar === 'number') {
    return Number.isFinite(scalar) ? scalar : undefined;
  }
  if (typeof scalar === 'string' && scalar.length > 0) {
    const parsed = Number(scalar);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const parseJson = (text: string): EsqlCellValue | undefined => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const toCellRecord = (value: EsqlCellValue | undefined): EsqlCellRecord | undefined => {
  const scalar = firstValue(value);
  const parsed = typeof scalar === 'string' ? parseJson(scalar) : scalar;
  return isCellRecord(parsed) ? parsed : undefined;
};

/** Reads `key` from a `flattened` value, whether its keys are dotted or nested. */
export const getAttribute = (
  attributes: EsqlCellValue | undefined,
  key: string
): EsqlCellValue | undefined => {
  const record = toCellRecord(attributes);
  if (record === undefined) {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    return record[key];
  }
  return key
    .split('.')
    .reduce<EsqlCellValue | undefined>(
      (current, part) => (isCellRecord(current) ? current[part] : undefined),
      record
    );
};
