/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeInferenceDocuments } from './serialize_inference_documents';

const serialize = (documents: Parameters<typeof serializeInferenceDocuments>[0]) =>
  JSON.parse(serializeInferenceDocuments(documents));

describe('serializeInferenceDocuments', () => {
  it('writes fields common to every document once', () => {
    expect(
      serialize([
        { _id: 'a', fields: { 'cloud.region': 'us', message: 'one' } },
        { _id: 'b', fields: { 'cloud.region': 'us', message: 'two' } },
      ])
    ).toEqual({
      shared_fields: { 'cloud.region': 'us' },
      groups: [
        {
          documents: [
            { _id: 'a', fields: { message: 'one' } },
            { _id: 'b', fields: { message: 'two' } },
          ],
        },
      ],
    });
  });

  it('groups documents that share more among themselves', () => {
    expect(
      serialize([
        { _id: 'a', fields: { 'service.name': 'cart', 'host.name': 'h1', message: 'one' } },
        { _id: 'b', fields: { 'service.name': 'cart', 'host.name': 'h1', message: 'two' } },
        { _id: 'c', fields: { 'service.name': 'pay', 'host.name': 'h2', message: 'three' } },
      ])
    ).toEqual({
      groups: [
        {
          shared_fields: { 'service.name': 'cart', 'host.name': 'h1' },
          documents: [
            { _id: 'a', fields: { message: 'one' } },
            { _id: 'b', fields: { message: 'two' } },
          ],
        },
        {
          documents: [
            {
              _id: 'c',
              fields: { 'service.name': 'pay', 'host.name': 'h2', message: 'three' },
            },
          ],
        },
      ],
    });
  });

  it('nests a prefix with several children and keeps the names recoverable', () => {
    expect(
      serialize([
        {
          _id: 'a',
          fields: {
            'kubernetes.pod.name': 'p',
            'kubernetes.pod.uid': 'u',
            'kubernetes.namespace': 'n',
            'cloud.provider': 'gcp',
            'error.stack_trace': 'trace',
            'error.stack_trace.lines': 3,
          },
        },
      ]).groups[0].documents[0].fields
    ).toEqual({
      kubernetes: { pod: { name: 'p', uid: 'u' }, namespace: 'n' },
      'cloud.provider': 'gcp',
      error: { stack_trace: 'trace', 'stack_trace.lines': 3 },
    });
  });

  it('drops a sub-field that repeats the value of its parent', () => {
    expect(
      serialize([
        { _id: 'a', fields: { 'host.name': 'h', 'host.name.text': 'h', 'host.name.length': 1 } },
      ]).groups[0].documents[0].fields
    ).toEqual({ host: { name: 'h', 'name.length': 1 } });
  });
});
