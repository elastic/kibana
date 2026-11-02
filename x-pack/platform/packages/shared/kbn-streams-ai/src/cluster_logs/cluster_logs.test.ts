/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { getFields } from './cluster_logs';

describe('getFields', () => {
  it('extracts field from simple filter condition', () => {
    const condition: Condition = { field: 'service.name', eq: 'api' };
    expect(getFields(condition)).toEqual(['service.name']);
  });

  it('extracts fields from AND condition', () => {
    const condition: Condition = {
      and: [
        { field: 'service.name', eq: 'api' },
        { field: 'log.level', eq: 'error' },
      ],
    };
    expect(getFields(condition)).toEqual(['service.name', 'log.level']);
  });

  it('extracts fields from OR condition', () => {
    const condition: Condition = {
      or: [
        { field: 'service.name', eq: 'api' },
        { field: 'service.name', eq: 'web' },
      ],
    };
    expect(getFields(condition)).toEqual(['service.name', 'service.name']);
  });

  it('extracts field from NOT condition', () => {
    const condition: Condition = {
      not: { field: 'cloud.availability_zone', eq: 'us-east-1a' },
    };
    expect(getFields(condition)).toEqual(['cloud.availability_zone']);
  });

  it('extracts fields from nested NOT within AND', () => {
    const condition: Condition = {
      and: [
        { field: 'service.name', eq: 'api' },
        { not: { field: 'cloud.region', eq: 'us-west-2' } },
      ],
    };
    expect(getFields(condition)).toEqual(['service.name', 'cloud.region']);
  });

  it('extracts fields from deeply nested conditions', () => {
    const condition: Condition = {
      and: [
        {
          or: [{ field: 'a', eq: '1' }, { not: { field: 'b', eq: '2' } }],
        },
        {
          not: {
            and: [
              { field: 'c', eq: '3' },
              { field: 'd', eq: '4' },
            ],
          },
        },
      ],
    };
    expect(getFields(condition)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns empty array for always condition', () => {
    const condition: Condition = { always: {} };
    expect(getFields(condition)).toEqual([]);
  });

  it('returns empty array for never condition', () => {
    const condition: Condition = { never: {} };
    expect(getFields(condition)).toEqual([]);
  });
});
