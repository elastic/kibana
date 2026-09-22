/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitIdentifierSchema, streamsUnitUpsertRequestSchema } from '@kbn/streams-schema';
import { makeZodValidationObject } from '@kbn/server-route-repository';
import { z } from '@kbn/zod/v4';
import { parseUnitPutBody } from './parse_unit_put_body';

const unit = {
  sources: [
    {
      id: 'nop-input',
      type: 'nop',
      supported_telemetry: ['logs'],
    },
  ],
  destinations: [
    {
      id: 'debug-out',
      type: 'debug',
      supported_telemetry: ['logs'],
    },
  ],
  pipelines: [
    {
      id: 'main',
      supported_telemetry: ['logs'],
      config: [
        { name: 'sources', value: ['nop-input'] },
        { name: 'destinations', value: ['debug-out'] },
      ],
    },
  ],
};

const yaml = `sources:
  - id: nop-input
    type: nop
    supported_telemetry:
      - logs
destinations:
  - id: debug-out
    type: debug
    supported_telemetry:
      - logs
pipelines:
  - id: main
    supported_telemetry:
      - logs
    config:
      - name: sources
        value:
          - nop-input
      - name: destinations
        value:
          - debug-out
`;

describe('parseUnitPutBody', () => {
  it('parses the JSON upsert envelope', () => {
    expect(
      parseUnitPutBody({
        body: Buffer.from(
          JSON.stringify({
            unit,
            ui_metadata: { nodes: { 'nop-input': { x: 1, y: 2 } } },
            secrets: { es_api_key: 's3cret' },
          })
        ),
        contentType: 'application/json; charset=utf-8',
      })
    ).toEqual({
      unit,
      ui_metadata: { nodes: { 'nop-input': { x: 1, y: 2 } } },
      secrets: { es_api_key: 's3cret' },
    });
  });

  it('parses a YAML unit document without wrapping it in JSON', () => {
    const parsed = parseUnitPutBody({
      body: Buffer.from(yaml),
      contentType: 'application/yaml',
    });

    expect(parsed).toEqual({ unit });
    expect(parsed).not.toHaveProperty('ui_metadata');
  });

  it('treats text/yaml as a unit document', () => {
    expect(
      parseUnitPutBody({
        body: Buffer.from(yaml),
        contentType: 'text/yaml',
      }).unit.sources[0].id
    ).toBe('nop-input');
  });

  it('sniffs YAML when Content-Type is omitted', () => {
    expect(
      parseUnitPutBody({
        body: Buffer.from(yaml),
        contentType: undefined,
      }).unit.destinations[0].type
    ).toBe('debug');
  });

  it('rejects invalid YAML syntax', () => {
    expect(() =>
      parseUnitPutBody({
        body: Buffer.from('sources: [\n  - not: yaml'),
        contentType: 'application/yaml',
      })
    ).toThrow(/Invalid Streams unit YAML/);
  });

  it('rejects a YAML document that is not a unit', () => {
    expect(() =>
      parseUnitPutBody({
        body: Buffer.from('unit: not-a-unit-document\n'),
        contentType: 'application/yaml',
      })
    ).toThrow(/Invalid Streams unit YAML/);
  });

  it('rejects invalid JSON', () => {
    expect(() =>
      parseUnitPutBody({
        body: Buffer.from('{'),
        contentType: 'application/json',
      })
    ).toThrow('Invalid Streams unit JSON.');
  });

  it('rejects an empty body', () => {
    expect(() =>
      parseUnitPutBody({
        body: Buffer.from('  \n'),
        contentType: 'application/yaml',
      })
    ).toThrow('Request body is required.');
  });

  it('accepts a YAML document that omits destinations and pipelines (Kibana defaults)', () => {
    expect(
      parseUnitPutBody({
        body: Buffer.from(
          'sources:\n  - id: nop-input\n    type: nop\n    supported_telemetry: [logs]\n'
        ),
        contentType: 'application/yaml',
      }).unit
    ).toEqual({
      sources: [
        {
          id: 'nop-input',
          type: 'nop',
          supported_telemetry: ['logs'],
        },
      ],
      destinations: [],
      pipelines: [],
    });
  });

  it('keeps a raw Buffer through Kibana route body validation', () => {
    const { body } = makeZodValidationObject(
      z.object({
        path: z.object({ id: streamsUnitIdentifierSchema }),
        body: z.union([streamsUnitUpsertRequestSchema, z.instanceof(Buffer)]),
      })
    );

    expect(body.parse(Buffer.from(yaml))).toBeInstanceOf(Buffer);
  });
});
