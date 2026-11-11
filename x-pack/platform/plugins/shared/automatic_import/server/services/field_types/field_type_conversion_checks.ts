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

const getProcessorTag = (processor: unknown): unknown => {
  if (!processor || typeof processor !== 'object') return undefined;
  const [config] = Object.values(processor);
  return config && typeof config === 'object' ? (config as Record<string, unknown>).tag : undefined;
};

interface ConvertedField {
  name: string;
  tag: string;
  expectedValueType: string | undefined;
}

/**
 * Picks the edited fields to blame for a sample whose failing processor is unknown. When the
 * failed document is available, that's the first generated processor, in pipeline order, that left
 * its value unconverted: `on_failure` stops the pipeline there, so later ones never ran. Otherwise
 * it's every edited field the sample has a value for.
 */
const getFallbackBlame = (
  fieldsInPipelineOrder: readonly ConvertedField[],
  baseDocument: SampleDocument,
  failedDocument: SampleDocument
): Set<string> => {
  const candidates = fieldsInPipelineOrder.filter(
    ({ name }) => getPopulatedValues(baseDocument, name).length > 0
  );
  if (!failedDocument) return new Set(candidates.map(({ name }) => name));
  const culprit = candidates.find(
    ({ name, expectedValueType }) =>
      !expectedValueType ||
      getPopulatedValues(failedDocument, name).some((value) => typeof value !== expectedValueType)
  );
  return new Set(culprit ? [culprit.name] : []);
};

/**
 * Finds edited fields whose generated convert processor failed (`convert_failed`) or left values
 * unconverted, for example because of a user-added condition (`convert_unsupported`).
 * `failingTags` holds, by sample index, the failing processor tag of each sample that fails only
 * once the generated processors are added. Those samples always count against an edited field, so
 * a failure can't pass whatever the pipeline's `on_failure` writes.
 */
export const collectConversionErrors = ({
  overrides,
  baseDocuments,
  finalResponse,
  finalPipeline,
  failingTags,
}: {
  overrides: FieldTypeOverride[];
  baseDocuments: SampleDocument[];
  finalResponse: estypes.IngestSimulateResponse;
  finalPipeline: { processors?: readonly unknown[] };
  failingTags: ReadonlyMap<number, string | undefined>;
}): FieldTypeError[] => {
  const docs = finalResponse.docs ?? [];
  const errorTexts = docs.map(getErrorText);
  const convertedFields = overrides.flatMap(({ name, type, original_type: originalType }) => {
    const convertType = getConvertType(originalType, type);
    if (!convertType) return [];
    return [
      {
        name,
        tag: getFieldTypeProcessorTag(name),
        expectedValueType: EXPECTED_VALUE_TYPES[convertType],
      },
    ];
  });
  const generatedTags = new Set(convertedFields.map(({ tag }) => tag));
  const tagOrder = (finalPipeline.processors ?? []).map(getProcessorTag);
  const getPosition = ({ tag }: ConvertedField) => {
    const position = tagOrder.indexOf(tag);
    return position === -1 ? Infinity : position;
  };
  const fieldsInPipelineOrder = [...convertedFields].sort(
    (a, b) => getPosition(a) - getPosition(b)
  );
  const fallbackBlame = new Map(
    [...failingTags]
      .filter(([, failingTag]) => failingTag === undefined || !generatedTags.has(failingTag))
      .map(([index]) => [
        index,
        getFallbackBlame(
          fieldsInPipelineOrder,
          baseDocuments[index],
          docs[index]?.doc?._source as SampleDocument
        ),
      ])
  );

  return convertedFields.flatMap(({ name, tag, expectedValueType }) => {
    const totalDocuments = baseDocuments.filter(
      (document) => getPopulatedValues(document, name).length > 0
    ).length;
    const convertFailures = docs.filter((_doc, index) => {
      const errorText = errorTexts[index];
      if (errorText !== undefined && failedOnTag(errorText, tag)) return true;
      return failingTags.get(index) === tag || Boolean(fallbackBlame.get(index)?.has(name));
    }).length;
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
