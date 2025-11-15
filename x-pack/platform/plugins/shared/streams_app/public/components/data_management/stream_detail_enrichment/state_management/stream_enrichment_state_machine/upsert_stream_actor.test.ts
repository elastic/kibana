/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';

import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { convertUIStepsToDSL } from '@kbn/streamlang';

import { buildStreamSaveRequest } from './upsert_stream_actor';

jest.mock('@kbn/streamlang', () => {
  const actual = jest.requireActual('@kbn/streamlang');
  return {
    ...actual,
    convertUIStepsToDSL: jest.fn(() => ['converted-step']),
  };
});

const convertUIStepsToDSLMock = convertUIStepsToDSL as jest.Mock;

describe('buildStreamSaveRequest', () => {
  const steps: StreamlangStepWithUIAttributes[] = [];
  const fields = { foo: { type: 'keyword' } } as unknown as FieldDefinition;

  afterEach(() => {
    jest.restoreAllMocks();
    convertUIStepsToDSLMock.mockClear();
  });

  it('builds a wired stream request body and url', () => {
    const definition = createDefinition('wired');
    const wiredGuard = jest.spyOn(Streams.WiredStream.GetResponse, 'is').mockReturnValue(true);

    const request = buildStreamSaveRequest(definition, steps, fields);

    expect(convertUIStepsToDSLMock).toHaveBeenCalledWith(steps);
    expect(request.method).toBe('PUT');
    expect(request.url).toBe('/api/streams/wired-stream/_ingest');
    expect(request.body.ingest.processing).toEqual(['converted-step']);
    expect((request.body.ingest as any).wired.fields).toBe(fields);

    wiredGuard.mockRestore();
  });

  it('builds a classic stream request body and url', () => {
    const definition = createDefinition('classic');
    const wiredGuard = jest.spyOn(Streams.WiredStream.GetResponse, 'is').mockReturnValue(false);

    const request = buildStreamSaveRequest(definition, steps, fields);

    expect(request.url).toBe('/api/streams/classic-stream/_ingest');
    expect((request.body.ingest as any).classic.field_overrides).toBe(fields);
    expect(request.body.ingest.processing).toEqual(['converted-step']);

    wiredGuard.mockRestore();
  });
});

function createDefinition(type: 'wired' | 'classic'): Streams.ingest.all.GetResponse {
  if (type === 'wired') {
    return {
      stream: {
        name: 'wired-stream',
        ingest: {
          processing: [],
          wired: {
            fields: {},
            routing: [],
          },
        },
      },
    } as unknown as Streams.ingest.all.GetResponse;
  }

  return {
    stream: {
      name: 'classic-stream',
      ingest: {
        processing: [],
        classic: {
          field_overrides: {},
          routing: [],
        },
      },
    },
  } as unknown as Streams.ingest.all.GetResponse;
}
