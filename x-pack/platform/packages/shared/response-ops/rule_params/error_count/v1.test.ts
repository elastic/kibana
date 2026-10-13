/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errorCountParamsSchema } from './v1';

const base = {
  windowSize: 5,
  windowUnit: 'm',
  threshold: 25,
  serviceName: 'opbeans-java',
  environment: 'production',
  groupBy: ['service.name', 'service.environment'],
  errorGroupingKey: 'abc123',
};

describe('errorCountParamsSchema', () => {
  it('accepts valid params, including maximum length strings and ten group by fields', () => {
    expect(() => errorCountParamsSchema.validate(base)).not.toThrow();
    expect(() =>
      errorCountParamsSchema.validate({
        ...base,
        serviceName: 'a'.repeat(1024),
        groupBy: Array.from({ length: 10 }, () => 'a'.repeat(1024)),
      })
    ).not.toThrow();
  });

  it.each(['serviceName', 'environment', 'errorGroupingKey'])(
    'rejects an over-long %s',
    (field) => {
      expect(() => errorCountParamsSchema.validate({ ...base, [field]: 'a'.repeat(1025) })).toThrow(
        /maximum length/
      );
    }
  );

  it('rejects an over-long windowUnit', () => {
    expect(() => errorCountParamsSchema.validate({ ...base, windowUnit: 'm'.repeat(11) })).toThrow(
      /maximum length/
    );
  });

  it('rejects an over-long groupBy item', () => {
    expect(() => errorCountParamsSchema.validate({ ...base, groupBy: ['a'.repeat(1025)] })).toThrow(
      /maximum length/
    );
  });

  it('rejects more than ten groupBy fields', () => {
    expect(() =>
      errorCountParamsSchema.validate({ ...base, groupBy: Array.from({ length: 11 }, () => 'a') })
    ).toThrow(/cannot be greater than \[10\]/);
  });

  it('rejects an over-long search configuration query and language', () => {
    const searchConfiguration = (query: unknown, language = 'kuery') => ({
      query: { query, language },
    });
    expect(() =>
      errorCountParamsSchema.validate({ ...base, searchConfiguration: searchConfiguration('a') })
    ).not.toThrow();
    expect(() =>
      errorCountParamsSchema.validate({
        ...base,
        searchConfiguration: searchConfiguration('a'.repeat(10_001)),
      })
    ).toThrow();
    expect(() =>
      errorCountParamsSchema.validate({
        ...base,
        searchConfiguration: searchConfiguration('a', 'k'.repeat(65)),
      })
    ).toThrow(/maximum length/);
  });
});
