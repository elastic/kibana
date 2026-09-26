/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { streamsUnitIdentifierSchema } from '@kbn/streams-schema';
import { makeZodValidationObject } from '@kbn/server-route-repository';
import { z } from '@kbn/zod/v4';
import { assertUnitPutEnvelope, parseUnitPutBody } from './parse_unit_put_body';

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

  it('does not schema-validate a YAML document', () => {
    expect(
      parseUnitPutBody({
        body: Buffer.from('unit: not-a-unit-document\n'),
        contentType: 'application/yaml',
      })
    ).toEqual({ unit: { unit: 'not-a-unit-document' } });
  });

  it('does not schema-validate the JSON unit document', () => {
    const unitDocument = {
      sources: [{ id: '_default_', type: 'not-a-real-type' }],
      unexpected: true,
    };

    expect(
      parseUnitPutBody({
        body: Buffer.from(JSON.stringify({ unit: unitDocument, ui_metadata: { extra: 1 } })),
        contentType: 'application/json',
      })
    ).toEqual({
      unit: unitDocument,
      ui_metadata: { extra: 1 },
    });
  });

  it('decodes invalid envelope fields without checking them', () => {
    expect(
      parseUnitPutBody({
        body: Buffer.from(JSON.stringify({ unit, ui_metadata: null, secrets: { es_api_key: 1 } })),
        contentType: 'application/json',
      })
    ).toEqual({
      unit,
      ui_metadata: null,
      secrets: { es_api_key: 1 },
    });
  });

  it('rejects ui_metadata that is not an object', () => {
    const parsed = parseUnitPutBody({
      body: Buffer.from(JSON.stringify({ unit, ui_metadata: null })),
      contentType: 'application/json',
    });

    expect(() => assertUnitPutEnvelope(parsed)).toThrow(/ui_metadata/);
  });

  it('rejects secrets that are not a string map', () => {
    const parsed = parseUnitPutBody({
      body: Buffer.from(JSON.stringify({ unit, secrets: { es_api_key: 1 } })),
      contentType: 'application/json',
    });

    expect(() => assertUnitPutEnvelope(parsed)).toThrow(/secrets/);
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

  it('keeps a YAML document that omits destinations and pipelines', () => {
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
    });
  });

  it('does not schema-validate the PUT body in route params', () => {
    const { body } = makeZodValidationObject(
      z.object({
        path: z.object({ id: streamsUnitIdentifierSchema }),
        body: z.custom<StreamsUnit.UpsertRequest | Buffer>(() => true),
      })
    );

    expect(body.parse(Buffer.from(yaml))).toBeInstanceOf(Buffer);
    expect(body.parse({ unit: { not: 'a unit' } })).toEqual({ unit: { not: 'a unit' } });
  });
});
