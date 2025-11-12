/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import type { SchemaField } from '../types';
import { buildSchemaSaveRequest } from './use_schema_fields';

describe('buildSchemaSaveRequest', () => {
  it('builds a wired stream request body', () => {
    const definition = createDefinition('wired');
    const fields = createMappedFields();
    const wiredGuard = jest.spyOn(Streams.WiredStream.GetResponse, 'is').mockReturnValue(true);

    const request = buildSchemaSaveRequest(definition, fields);

    expect(request.url).toBe('/api/streams/wired/_ingest');
    expect(request.body.ingest.wired.fields.foo).toBeDefined();

    wiredGuard.mockRestore();
  });

  it('builds a classic stream request body', () => {
    const definition = createClassicDefinition('classic');
    const fields = createMappedFields();
    const wiredGuard = jest.spyOn(Streams.WiredStream.GetResponse, 'is').mockReturnValue(false);

    const request = buildSchemaSaveRequest(definition, fields);

    expect(request.body.ingest.classic.field_overrides.foo).toBeDefined();

    wiredGuard.mockRestore();
  });
});

const createDefinition = (name: string): Streams.WiredStream.GetResponse =>
  ({
    stream: {
      name,
      ingest: {
        processing: [],
        wired: {
          fields: {},
          routing: [],
        },
      },
    },
  } as unknown as Streams.WiredStream.GetResponse);

const createClassicDefinition = (name: string): Streams.ClassicStream.GetResponse =>
  ({
    stream: {
      name,
      ingest: {
        processing: [],
        classic: {
          field_overrides: {},
          routing: [],
        },
      },
    },
  } as unknown as Streams.ClassicStream.GetResponse);

const createMappedFields = (): SchemaField[] => [
  {
    name: 'foo',
    parent: 'logs-foo',
    status: 'mapped',
    type: 'keyword',
  },
];
