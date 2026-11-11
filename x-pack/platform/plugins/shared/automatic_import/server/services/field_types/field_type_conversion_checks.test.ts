/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { FieldTypeOverride } from '../saved_objects/schemas/types';
import { collectConversionErrors } from './field_type_conversion_checks';

const overrides: FieldTypeOverride[] = [
  { name: 'count', type: 'long', original_type: 'keyword' },
  { name: 'bytes', type: 'long', original_type: 'keyword' },
];
const baseDocuments = [
  { count: '1', bytes: '10' },
  { count: '2', bytes: '0xFFFFFFFFFFFFFFFFF' },
];
const finalPipeline = {
  processors: [
    { json: { field: 'message' } },
    { convert: { tag: 'automatic_import_field_type:bytes', field: 'bytes', type: 'long' } },
    { convert: { tag: 'automatic_import_field_type:count', field: 'count', type: 'long' } },
  ],
};

const respond = (docs: Array<Record<string, unknown> | undefined>) =>
  ({ docs } as unknown as estypes.IngestSimulateResponse);

/** The second sample failed on `bytes`, and `on_failure` recorded the error without the tag. */
const taglessFailure = respond([
  { doc: { _source: { count: 1, bytes: 10 } } },
  { doc: { _source: { count: '2', bytes: '0xFFFFFFFFFFFFFFFFF', error: { message: ['x'] } } } },
]);

const convertFailed = (name: string) => ({
  name,
  issue: 'convert_failed',
  failing_documents: 1,
  total_documents: 2,
});

describe('collectConversionErrors', () => {
  it('blames the generated processor that failed on a newly failing sample', () => {
    expect(
      collectConversionErrors({
        overrides,
        baseDocuments,
        finalResponse: taglessFailure,
        finalPipeline,
        failingTags: new Map([[1, 'automatic_import_field_type:bytes']]),
      })
    ).toEqual([convertFailed('bytes')]);
  });

  it('still finds the failing processor from the error text', () => {
    expect(
      collectConversionErrors({
        overrides,
        baseDocuments,
        finalResponse: respond([
          { doc: { _source: { count: 1, bytes: 10 } } },
          {
            doc: {
              _source: {
                error: {
                  message: ["Processor 'convert' with tag 'automatic_import_field_type:bytes'"],
                },
              },
            },
          },
        ]),
        finalPipeline,
        failingTags: new Map(),
      })
    ).toEqual([convertFailed('bytes')]);
  });

  it('blames the first generated processor that left its value unconverted when the failing processor is unknown', () => {
    expect(
      collectConversionErrors({
        overrides,
        baseDocuments,
        finalResponse: taglessFailure,
        finalPipeline,
        failingTags: new Map([[1, undefined]]),
      })
    ).toEqual([convertFailed('bytes')]);
  });

  it('treats a non-generated failing processor as unknown', () => {
    expect(
      collectConversionErrors({
        overrides,
        baseDocuments,
        finalResponse: taglessFailure,
        finalPipeline,
        failingTags: new Map([[1, 'user_script']]),
      })
    ).toEqual([convertFailed('bytes')]);
  });

  it('blames every edited field with a value when the failed document is not returned', () => {
    expect(
      collectConversionErrors({
        overrides,
        baseDocuments,
        finalResponse: respond([
          { doc: { _source: { count: 1, bytes: 10 } } },
          { error: { type: 'illegal_argument_exception', reason: 'unable to convert' } },
        ]),
        finalPipeline,
        failingTags: new Map([[1, undefined]]),
      })
    ).toEqual([convertFailed('count'), convertFailed('bytes')]);
  });

  it('ignores samples that are not newly failing', () => {
    expect(
      collectConversionErrors({
        overrides,
        baseDocuments,
        finalResponse: taglessFailure,
        finalPipeline,
        failingTags: new Map(),
      })
    ).toEqual([]);
  });
});
