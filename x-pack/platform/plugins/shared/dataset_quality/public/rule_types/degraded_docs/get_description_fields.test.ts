/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_PREBUILD_DESCRIPTION_FIELDS } from '@kbn/triggers-actions-ui-plugin/public';
import type { Rule, PrebuildFieldsMap } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { HttpSetup } from '@kbn/core/public';
import { getDescriptionFields } from '.';
import type { DegradedDocsRuleParams } from '@kbn/response-ops-rule-params/degraded_docs';

describe('degraded_docs getDescriptionFields', () => {
  const mockPrebuildField = jest.fn();
  const mockPrebuildFields = {
    [RULE_PREBUILD_DESCRIPTION_FIELDS.INDEX_PATTERN]: mockPrebuildField,
  } as unknown as PrebuildFieldsMap;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when rule is not provided', () => {
    const result = getDescriptionFields({
      rule: undefined as unknown as Rule<DegradedDocsRuleParams>,
      prebuildFields: mockPrebuildFields,
      http: {} as HttpSetup,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when prebuildFields is not provided', () => {
    const mockRule = {
      params: {
        searchConfiguration: {
          index: 'logs-*',
        },
        threshold: [10],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        comparator: '>',
      },
    } as unknown as Rule<DegradedDocsRuleParams>;

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: undefined,
      http: {} as HttpSetup,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when both rule and prebuildFields are not provided', () => {
    const result = getDescriptionFields({
      rule: undefined as unknown as Rule<DegradedDocsRuleParams>,
      prebuildFields: undefined,
      http: {} as HttpSetup,
    });

    expect(result).toEqual([]);
  });

  it('should call prebuildField with index wrapped in array', () => {
    const mockRule = {
      params: {
        searchConfiguration: {
          index: 'logs-*',
        },
        threshold: [10],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        comparator: '>',
      },
    } as unknown as Rule<DegradedDocsRuleParams>;

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
});
