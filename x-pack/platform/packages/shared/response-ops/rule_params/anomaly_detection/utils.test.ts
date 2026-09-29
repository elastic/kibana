/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import { validateCustomFilterFields } from '@kbn/ml-anomaly-utils';

import { validateKQLStringFilter } from '../common/utils';
import { validateAnomalyDetectionCustomFilter } from './utils';

vi.mock('../common/utils', () => {
      const mocked = {
      validateKQLStringFilter: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/ml-anomaly-utils', () => {
      const mocked = {
      validateCustomFilterFields: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockResultType = 'record' as MlAnomalyResultType;

describe('validateAnomalyDetectionCustomFilter', () => {
  const mockValidateKQLStringFilter = validateKQLStringFilter as MockedFunction<
    typeof validateKQLStringFilter
  >;
  const mockValidateCustomFilterFields = validateCustomFilterFields as MockedFunction<
    typeof validateCustomFilterFields
  >;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined when no query is provided', () => {
    const result = validateAnomalyDetectionCustomFilter(null, mockResultType);

    expect(result).toBeUndefined();
    expect(mockValidateKQLStringFilter).not.toHaveBeenCalled();
    expect(mockValidateCustomFilterFields).not.toHaveBeenCalled();
  });

  it('short-circuits when validateKQLStringFilter returns an error', () => {
    mockValidateKQLStringFilter.mockReturnValue('syntax error');

    const result = validateAnomalyDetectionCustomFilter('source.ip : *', mockResultType);

    expect(result).toBe('syntax error');
    expect(mockValidateCustomFilterFields).not.toHaveBeenCalled();
  });

  it('returns custom filter error when validateCustomFilterFields fails', () => {
    mockValidateKQLStringFilter.mockReturnValue(undefined);
    mockValidateCustomFilterFields.mockReturnValue('field error');

    const result = validateAnomalyDetectionCustomFilter('host.name:host-0', mockResultType);

    expect(mockValidateKQLStringFilter).toHaveBeenCalledWith('host.name:host-0');
    expect(mockValidateCustomFilterFields).toHaveBeenCalledWith('host.name:host-0', mockResultType);
    expect(result).toBe('field error');
  });

  it('returns undefined when both validations pass', () => {
    mockValidateKQLStringFilter.mockReturnValue(undefined);
    mockValidateCustomFilterFields.mockReturnValue(undefined);

    const result = validateAnomalyDetectionCustomFilter('host.name:host-1', mockResultType);

    expect(result).toBeUndefined();
    expect(mockValidateCustomFilterFields).toHaveBeenCalled();
  });
});
