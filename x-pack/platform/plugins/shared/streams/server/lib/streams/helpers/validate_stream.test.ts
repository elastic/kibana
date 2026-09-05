/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { validateBracketsInFieldNames, validateRootStreamChanges } from './validate_stream';
import { MalformedStreamError } from '../errors/malformed_stream_error';
import { RootStreamImmutabilityError } from '../errors/root_stream_immutability_error';
import { createRootStreamDefinition } from '../root_stream_definition';

describe('validateBracketsInFieldNames', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createWiredStream = (overrides: any = {}) => ({
    ingest: {
      processing: { steps: [] },
      ...overrides.ingest,
      wired: {
        fields: {},
        routing: [],
        ...overrides.ingest?.wired,
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createClassicStream = (overrides: any = {}) => ({
    ingest: {
      classic: {
        ...overrides,
      },
    },
  });

  it('should not throw for a valid wired stream', () => {
    const stream = createWiredStream({
      ingest: {
        wired: {
          fields: { 'valid.field': { type: 'keyword' } },
          routing: [{ destination: 'a', where: { field: 'another.valid.field', eq: 'value' } }],
        },
        processing: {
          steps: [
            {
              action: 'rename',
              from: 'source',
              to: 'destination',
            },
          ],
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateBracketsInFieldNames(stream as any)).not.toThrow();
  });

  it('should throw for an invalid field name in wired stream fields', () => {
    const stream = createWiredStream({
      ingest: { wired: { fields: { 'invalid[field]': { type: 'keyword' } } } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });

  it('should throw for an invalid field name in wired stream routing', () => {
    const stream = createWiredStream({
      ingest: {
        wired: {
          routing: [{ destination: 'a', where: { field: 'invalid[field]', eq: 'value' } }],
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });

  it('should not throw for a valid classic stream', () => {
    const stream = createClassicStream({
      field_overrides: { 'valid.field': { type: 'keyword' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateBracketsInFieldNames(stream as any)).not.toThrow();
  });

  it('should throw for an invalid field name in classic stream field_overrides', () => {
    const stream = createClassicStream({
      field_overrides: { 'invalid[field]': { type: 'keyword' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });
});

describe('validateRootStreamChanges', () => {
  const createCurrentAndNext = (streamName = 'logs.otel') => {
    const current = createRootStreamDefinition(streamName);
    const next = cloneDeep(current);
    return { current, next };
  };

  it('allows adding a custom field on logs.otel', () => {
    const { current, next } = createCurrentAndNext('logs.otel');
    next.ingest.wired.fields['attributes.organization_id'] = { type: 'keyword' };

    expect(() => validateRootStreamChanges(current, next)).not.toThrow();
  });

  it('allows adding a custom field on logs.ecs', () => {
    const { current, next } = createCurrentAndNext('logs.ecs');
    next.ingest.wired.fields['organization.id'] = { type: 'keyword' };

    expect(() => validateRootStreamChanges(current, next)).not.toThrow();
  });

  it('allows removing a custom field', () => {
    const { current, next } = createCurrentAndNext();
    current.ingest.wired.fields['attributes.organization_id'] = { type: 'keyword' };
    next.ingest.wired.fields['attributes.organization_id'] = { type: 'keyword' };
    delete next.ingest.wired.fields['attributes.organization_id'];

    expect(() => validateRootStreamChanges(current, next)).not.toThrow();
  });

  it('allows changing the type of a custom field', () => {
    const { current, next } = createCurrentAndNext();
    current.ingest.wired.fields['attributes.organization_id'] = { type: 'keyword' };
    next.ingest.wired.fields['attributes.organization_id'] = { type: 'long' };

    expect(() => validateRootStreamChanges(current, next)).not.toThrow();
  });

  it('allows adding a description to a built-in field', () => {
    const { current, next } = createCurrentAndNext();
    next.ingest.wired.fields['@timestamp'] = {
      ...next.ingest.wired.fields['@timestamp'],
      description: 'Event timestamp',
    };

    expect(() => validateRootStreamChanges(current, next)).not.toThrow();
  });

  it('rejects removing a built-in field', () => {
    const { current, next } = createCurrentAndNext();
    delete next.ingest.wired.fields['@timestamp'];

    expect(() => validateRootStreamChanges(current, next)).toThrow(RootStreamImmutabilityError);
    expect(() => validateRootStreamChanges(current, next)).toThrow(
      'Cannot remove built-in field [@timestamp] from the root stream'
    );
  });

  it('rejects overriding a built-in field type', () => {
    const { current, next } = createCurrentAndNext();
    next.ingest.wired.fields.severity_text = { type: 'boolean' };

    expect(() => validateRootStreamChanges(current, next)).toThrow(RootStreamImmutabilityError);
    expect(() => validateRootStreamChanges(current, next)).toThrow(
      'Cannot override built-in field [severity_text] on the root stream'
    );
  });

  it('rejects processing changes', () => {
    const { current, next } = createCurrentAndNext();
    next.ingest.processing.steps = [
      {
        action: 'rename',
        from: 'body.text',
        to: 'attributes.message',
      },
    ];

    expect(() => validateRootStreamChanges(current, next)).toThrow(RootStreamImmutabilityError);
    expect(() => validateRootStreamChanges(current, next)).toThrow(
      'Root stream processing rules cannot be changed'
    );
  });
});
