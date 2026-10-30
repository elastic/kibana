/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { FieldTypeError } from '../../../common';
import { getConvertType, getFieldTypeProcessorTag, getFieldValue } from '../../../common';
import type { FieldTypeOverride } from '../saved_objects/schemas/types';

type SampleDocument = Record<string, unknown> | undefined;

const EXPECTED_VALUE_TYPES: Readonly<Record<string, 'number' | 'boolean' | 'string'>> = {
  integer: 'number',
  long: 'number',
  float: 'number',
  double: 'number',
  boolean: 'boolean',
  string: 'string',
};

const isPresent = (value: unknown): boolean => value !== undefined && value !== null;

const getPopulatedValues = (document: SampleDocument, name: string): unknown[] => {
  if (!document) return [];
  const value = getFieldValue(document, name);
  const values = Array.isArray(value) ? value.flat(Infinity) : [value];
  return values.filter(isPresent);
};

/** Error text of a simulated document that failed, whether or not the pipeline handled it. */
const getErrorText = (
  doc: estypes.IngestSimulateDocumentResult | undefined
): string | undefined => {
  if (doc?.error) return JSON.stringify(doc.error);
  const sourceError = doc?.doc?._source?.error;
  return isPresent(sourceError) ? JSON.stringify(sourceError) : undefined;
};

const failedOnTag = (errorText: string, tag: string): boolean =>
  errorText.includes(`${tag}'`) || errorText.includes(`${tag}\\"`) || errorText.includes(`${tag}"`);

/**
 * Finds edited fields whose generated convert processor failed (`convert_failed`) or left values
 * unconverted, for example because of a user-added condition (`convert_unsupported`).
 */
export const collectConversionErrors = ({
  overrides,
  baseDocuments,
  finalResponse,
}: {
  overrides: FieldTypeOverride[];
  baseDocuments: SampleDocument[];
  finalResponse: estypes.IngestSimulateResponse;
}): FieldTypeError[] => {
  const docs = finalResponse.docs ?? [];
  const errorTexts = docs.map(getErrorText);

  return overrides.flatMap(({ name, type, original_type: originalType }) => {
    const convertType = getConvertType(originalType, type);
    if (!convertType) return [];

    const totalDocuments = baseDocuments.filter(
      (document) => getPopulatedValues(document, name).length > 0
    ).length;
    const tag = getFieldTypeProcessorTag(name);
    const convertFailures = errorTexts.filter(
      (errorText) => errorText !== undefined && failedOnTag(errorText, tag)
    ).length;
    if (convertFailures > 0) {
      return [
        {
          name,
          issue: 'convert_failed',
          failing_documents: convertFailures,
          total_documents: totalDocuments,
        },
      ];
    }

    const expectedValueType = EXPECTED_VALUE_TYPES[convertType];
    if (!expectedValueType) return [];
    const unconverted = docs.filter((doc, index) => {
      if (errorTexts[index] !== undefined) return false;
      const source = doc?.doc?._source as SampleDocument;
      return getPopulatedValues(source, name).some((value) => typeof value !== expectedValueType);
    }).length;
    if (unconverted === 0) return [];

    return [
      {
        name,
        issue: 'convert_unsupported',
        failing_documents: unconverted,
        total_documents: totalDocuments,
      },
    ];
  });
};
