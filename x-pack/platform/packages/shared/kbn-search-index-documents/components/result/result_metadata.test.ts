/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import {
  reorderFieldsInImportance,
  resultTitle,
  resultToFieldFromMappings,
} from './result_metadata';
import type { FieldProps } from './result_types';

const makeSearchHit = (source: undefined | unknown): SearchHit =>
  ({
    _source: source,
  } as SearchHit);

describe('resultTitle', () => {
  it('returns result title if available', () => {
    expect(resultTitle(makeSearchHit({ title: 'test 123' }))).toEqual('test 123');
    expect(resultTitle(makeSearchHit({ name: 'this is a name' }))).toEqual('this is a name');
    expect(resultTitle(makeSearchHit({ name: 'this is a name', title: 'test 123' }))).toEqual(
      'test 123'
    );
    expect(resultTitle(makeSearchHit({ other: 'thing' }))).toEqual(undefined);
    expect(resultTitle(makeSearchHit(undefined))).toEqual(undefined);
  });
});

describe('reorderFieldsInImportance', () => {
  it('sorts fields by type and name', () => {
    const fields: FieldProps[] = [
      { fieldName: 'field6', fieldType: 'sparse_vector', fieldValue: 'value6' },
      { fieldName: 'field1', fieldType: 'semantic_text', fieldValue: 'value1' },
      { fieldName: 'field2', fieldType: 'dense_vector', fieldValue: 'value2' },
      { fieldName: 'field3', fieldType: 'sparse_vector', fieldValue: 'value3' },
      { fieldName: 'field4', fieldType: 'semantic_text', fieldValue: 'value4' },
      { fieldName: 'field5', fieldType: 'dense_vector', fieldValue: 'value5' },
    ];
    const sortedFields = [
      { fieldName: 'field1', fieldType: 'semantic_text', fieldValue: 'value1' },
      { fieldName: 'field4', fieldType: 'semantic_text', fieldValue: 'value4' },
      { fieldName: 'field2', fieldType: 'dense_vector', fieldValue: 'value2' },
      { fieldName: 'field5', fieldType: 'dense_vector', fieldValue: 'value5' },
      { fieldName: 'field3', fieldType: 'sparse_vector', fieldValue: 'value3' },
      { fieldName: 'field6', fieldType: 'sparse_vector', fieldValue: 'value6' },
    ];
    expect(reorderFieldsInImportance(fields)).toEqual(sortedFields);
  });

  it('sorts fields if they are special fields', () => {
    const fields: FieldProps[] = [
      { fieldName: 'field2', fieldType: 'dense_vector', fieldValue: 'value2' },
      { fieldName: 'body_content', fieldType: 'sparse_vector', fieldValue: 'value3' },
      { fieldName: 'headings', fieldType: 'text', fieldValue: 'value1' },
      { fieldName: 'field4', fieldType: 'semantic_text', fieldValue: 'value4' },
      { fieldName: 'field5', fieldType: 'dense_vector', fieldValue: 'value5' },
      { fieldName: 'field6', fieldType: 'sparse_vector', fieldValue: 'value6' },
    ];
    const sortedFields = [
      { fieldName: 'headings', fieldType: 'text', fieldValue: 'value1' },
      { fieldName: 'field4', fieldType: 'semantic_text', fieldValue: 'value4' },
      { fieldName: 'field2', fieldType: 'dense_vector', fieldValue: 'value2' },
      { fieldName: 'field5', fieldType: 'dense_vector', fieldValue: 'value5' },
      { fieldName: 'body_content', fieldType: 'sparse_vector', fieldValue: 'value3' },
      { fieldName: 'field6', fieldType: 'sparse_vector', fieldValue: 'value6' },
    ];
    expect(reorderFieldsInImportance(fields)).toEqual(sortedFields);
  });
});

describe('resultToFieldFromMappings', () => {
  it('maps source fields to their mapping type', () => {
    const result = makeSearchHit({ title: 'hello', count: 3 });
    expect(
      resultToFieldFromMappings(result, { title: { type: 'text' }, count: { type: 'long' } })
    ).toEqual([
      { fieldName: 'title', fieldType: 'text', fieldValue: JSON.stringify('hello', null, 2) },
      { fieldName: 'count', fieldType: 'long', fieldValue: JSON.stringify(3, null, 2) },
    ]);
  });

  it('extracts dense vector and dimensions for a semantic_text field', () => {
    const embeddings = [0.1, 0.2, 0.3];
    const result = makeSearchHit({
      body: 'the original text',
      _inference_fields: {
        body: {
          inference: {
            model_settings: { task_type: 'text_embedding', dimensions: 3 },
            chunks: {
              body: [{ embeddings }],
            },
          },
        },
      },
    });

    expect(resultToFieldFromMappings(result, { body: { type: 'semantic_text' } })).toEqual([
      {
        fieldName: 'body',
        fieldType: 'semantic_text',
        fieldValue: JSON.stringify('the original text', null, 2),
        dimensions: 3,
        embeddings: JSON.stringify(embeddings),
      },
    ]);
  });

  it('falls back to dimensions from embedding length when model_settings omits it', () => {
    const embeddings = [0.1, 0.2, 0.3, 0.4];
    const result = makeSearchHit({
      body: 'text',
      _inference_fields: {
        body: {
          inference: {
            model_settings: { task_type: 'text_embedding' },
            chunks: { body: [{ embeddings }] },
          },
        },
      },
    });

    expect(resultToFieldFromMappings(result, { body: { type: 'semantic_text' } })).toEqual([
      {
        fieldName: 'body',
        fieldType: 'semantic_text',
        fieldValue: JSON.stringify('text', null, 2),
        dimensions: 4,
        embeddings: JSON.stringify(embeddings),
      },
    ]);
  });

  it('renders all chunk vectors when a semantic_text field is chunked', () => {
    const embeddings = [
      [0.1, 0.2],
      [0.3, 0.4],
    ];
    const result = makeSearchHit({
      body: 'text',
      _inference_fields: {
        body: {
          inference: {
            model_settings: { task_type: 'text_embedding', dimensions: 2 },
            chunks: { body: embeddings.map((e) => ({ embeddings: e })) },
          },
        },
      },
    });

    expect(resultToFieldFromMappings(result, { body: { type: 'semantic_text' } })).toEqual([
      {
        fieldName: 'body',
        fieldType: 'semantic_text',
        fieldValue: JSON.stringify('text', null, 2),
        dimensions: 2,
        embeddings: JSON.stringify(embeddings),
      },
    ]);
  });

  it('does not add dimensions for a sparse_embedding semantic_text field', () => {
    const result = makeSearchHit({
      body: 'text',
      _inference_fields: {
        body: {
          inference: {
            model_settings: { task_type: 'sparse_embedding' },
            chunks: { body: [{ embeddings: { token: 0.5 } }] },
          },
        },
      },
    });

    expect(resultToFieldFromMappings(result, { body: { type: 'semantic_text' } })).toEqual([
      {
        fieldName: 'body',
        fieldType: 'semantic_text',
        fieldValue: JSON.stringify('text', null, 2),
      },
    ]);
  });

  it('excludes the _inference_fields metadata from the rendered fields', () => {
    const result = makeSearchHit({
      title: 'hello',
      _inference_fields: { title: {} },
    });

    expect(resultToFieldFromMappings(result, { title: { type: 'text' } })).toEqual([
      { fieldName: 'title', fieldType: 'text', fieldValue: JSON.stringify('hello', null, 2) },
    ]);
  });

  it('surfaces a semantic_text field populated via copy_to using hit.fields for text and _inference_fields for vectors', () => {
    const embeddings = [0.1, 0.2, 0.3];
    const result = {
      ...makeSearchHit({
        title: 'hello',
        _inference_fields: {
          semantic_field: {
            inference: {
              model_settings: { task_type: 'text_embedding', dimensions: 3 },
              chunks: { title: [{ embeddings }] }, // keyed by source field, not target
            },
          },
        },
      }),
      fields: { semantic_field: ['hello'] },
    };

    expect(
      resultToFieldFromMappings(result, {
        title: { type: 'text' },
        semantic_field: { type: 'semantic_text' },
      })
    ).toEqual([
      { fieldName: 'title', fieldType: 'text', fieldValue: JSON.stringify('hello', null, 2) },
      {
        fieldName: 'semantic_field',
        fieldType: 'semantic_text',
        fieldValue: JSON.stringify('hello', null, 2),
        dimensions: 3,
        embeddings: JSON.stringify(embeddings),
      },
    ]);
  });
});
