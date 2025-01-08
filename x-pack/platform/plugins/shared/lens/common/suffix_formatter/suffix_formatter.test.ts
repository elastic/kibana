/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormatFactory } from '../types';
import { getSuffixFormatter } from '.';

describe('suffix formatter', () => {
  it('should call nested formatter and apply suffix', () => {
    const convertMock = jest.fn((x) => x);
    const formatFactory = jest.fn(() => ({ convert: convertMock }));
    const SuffixFormatter = getSuffixFormatter(() => formatFactory as unknown as FormatFactory);
    const nestedParams = { abc: 123 };
    const formatterInstance = new SuffixFormatter({
      unit: 'h',
      id: 'nestedFormatter',
      params: nestedParams,
    });

    const result = formatterInstance.convert(12345);

    expect(result).toEqual('12345/h');
    expect(convertMock).toHaveBeenCalledWith(12345);
    expect(formatFactory).toHaveBeenCalledWith({ id: 'nestedFormatter', params: nestedParams });
  });

  it('should not add suffix to empty strings', () => {
    const convertMock = jest.fn((x) => '');
    const formatFactory = jest.fn(() => ({ convert: convertMock }));
    const SuffixFormatter = getSuffixFormatter(() => formatFactory as unknown as FormatFactory);
    const nestedParams = { abc: 123 };
    const formatterInstance = new SuffixFormatter({
      unit: 'h',
      id: 'nestedFormatter',
      params: nestedParams,
    });

    const result = formatterInstance.convert(12345);

    expect(result).toEqual('');
  });

  it('should be a hidden formatter', () => {
    const convertMock = jest.fn((x) => '');
    const formatFactory = jest.fn(() => ({ convert: convertMock }));
    const SuffixFormatter = getSuffixFormatter(() => formatFactory as unknown as FormatFactory);
    expect(SuffixFormatter.hidden).toBe(true);
  });
});
