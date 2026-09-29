/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { getEsNames } from './names';

vi.mock('../../../../../../package.json', () => {
  const mocked = {
    version: '1.2.3',
  };
  return { ...mocked, default: mocked };
});

describe('getEsNames()', () => {
  test('works as expected', () => {
    const base = 'XYZ';
    const esNames = getEsNames(base);
    expect(esNames.base).toEqual(base);
    expect(esNames.dataStream).toEqual(`${base}-event-log-ds`);
    expect(esNames.indexPattern).toEqual(`${base}-event-log-*`);
    expect(esNames.indexTemplate).toEqual(`${base}-event-log-template`);
  });
});
