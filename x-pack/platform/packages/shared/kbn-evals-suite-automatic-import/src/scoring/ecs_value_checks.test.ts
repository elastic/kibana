/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsFields } from './ecs_fields';
import { isValidEcsValue } from './ecs_value_checks';

const ECS_FIELDS: EcsFields = new Map([
  ['source.ip', { type: 'ip' }],
  ['http.response.bytes', { type: 'long' }],
  ['@timestamp', { type: 'date' }],
  ['user.name', { type: 'keyword' }],
  [
    'event.category',
    {
      type: 'keyword',
      allowedValues: [
        { name: 'authentication', expectedEventTypes: ['start', 'end', 'info'] },
        { name: 'process', expectedEventTypes: ['start', 'end', 'info', 'change'] },
      ],
    },
  ],
  [
    'event.type',
    {
      type: 'keyword',
      allowedValues: [{ name: 'start' }, { name: 'end' }, { name: 'info' }, { name: 'change' }],
    },
  ],
  ['event.kind', { type: 'keyword', allowedValues: [{ name: 'event' }, { name: 'signal' }] }],
]);

const isValid = (field: string, value: unknown, doc: Record<string, unknown> = {}): boolean =>
  isValidEcsValue({ line: 0, field, value, doc: { ...doc, [field]: value } }, ECS_FIELDS);

describe('isValidEcsValue', () => {
  it.each([
    ['source.ip', '81.2.69.142', true],
    ['source.ip', 'not-an-ip', false],
    ['http.response.bytes', '1437', true],
    ['http.response.bytes', '14.5', false],
    ['@timestamp', '2026-02-07T15:15:44.004Z', true],
    ['@timestamp', 1770477344004, true],
    ['@timestamp', 'yesterday', false],
    ['user.name', 'jdoe', true],
    ['user.name', null, false],
  ])('checks that %s = %p fits the field type', (field, value, valid) => {
    expect(isValid(field, value)).toBe(valid);
  });

  it('rejects values outside the allowed values', () => {
    expect(isValid('event.category', ['authentication'])).toBe(true);
    expect(isValid('event.category', ['login'])).toBe(false);
  });

  it('rejects allowed values that only Kibana sets, such as event.kind signal', () => {
    expect(isValid('event.kind', 'event')).toBe(true);
    expect(isValid('event.kind', 'signal')).toBe(false);
  });

  it('rejects an event.type that ECS does not allow for the event.category', () => {
    expect(isValid('event.type', ['start'], { 'event.category': ['authentication'] })).toBe(true);
    expect(isValid('event.type', ['change'], { 'event.category': ['authentication'] })).toBe(false);
    expect(isValid('event.category', ['authentication'], { 'event.type': ['change'] })).toBe(false);
  });
});
