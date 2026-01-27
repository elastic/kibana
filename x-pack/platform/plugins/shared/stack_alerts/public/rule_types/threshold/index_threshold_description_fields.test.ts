/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule, PrebuildFieldsMap } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { HttpSetup } from '@kbn/core/public';
import { getDescriptionFields } from './index_threshold_description_fields';
import type { IndexThresholdRuleParams } from './types';

describe('index_threshold getDescriptionFields', () => {
  const mockPrebuildField = jest.fn();
  const mockPrebuildCustomQuery = jest.fn();
  const mockPrebuildFields = {
    indexPattern: mockPrebuildField,
    customQuery: mockPrebuildCustomQuery,
  } as unknown as PrebuildFieldsMap;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when rule is not provided', () => {
    const result = getDescriptionFields({
      rule: undefined as unknown as Rule<IndexThresholdRuleParams>,
      prebuildFields: mockPrebuildFields,
      http: {} as HttpSetup,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when prebuildFields is not provided', () => {
    const mockRule = {
      params: {
        index: 'logs-*',
        threshold: [10],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        comparator: '>',
      },
    } as unknown as Rule<IndexThresholdRuleParams>;

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: undefined,
      http: {} as HttpSetup,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when both rule and prebuildFields are not provided', () => {
    const result = getDescriptionFields({
      rule: undefined as unknown as Rule<IndexThresholdRuleParams>,
      prebuildFields: undefined,
      http: {} as HttpSetup,
    });

    expect(result).toEqual([]);
  });

  it('should call index prebuildField with index wrapped in array', () => {
    const mockRule = {
      params: {
        index: 'logs-*',
        threshold: [10],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        comparator: '>',
      },
    } as unknown as Rule<IndexThresholdRuleParams>;

    const mockReturnValue = { type: 'index_pattern', value: 'logs-*' };
    mockPrebuildField.mockReturnValue(mockReturnValue);

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: mockPrebuildFields,
      http: {} as HttpSetup,
    });

    expect(mockPrebuildField).toHaveBeenCalledWith(['logs-*']);
    expect(result).toEqual([mockReturnValue]);
  });

  it('should call kql prebuild field when filter is present', () => {
    const mockRule = {
      params: {
        index: 'logs-*',
        filterKuery: 'host.name: "my-host"',
      },
    } as unknown as Rule<IndexThresholdRuleParams>;

    const mockReturnValue = { type: 'index_pattern', value: 'logs-*' };
    const mockCustomQueryReturnValue = { type: 'customQuery', value: 'host.name: "my-host"' };
    mockPrebuildField.mockReturnValue(mockReturnValue);
    mockPrebuildCustomQuery.mockReturnValue(mockCustomQueryReturnValue);

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: mockPrebuildFields,
      http: {} as HttpSetup,
    });

    expect(mockPrebuildField).toHaveBeenCalledWith(['logs-*']);
    expect(result).toEqual([mockReturnValue, mockCustomQueryReturnValue]);
  });
});
