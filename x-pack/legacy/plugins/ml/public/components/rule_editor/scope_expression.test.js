/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Mock the mlJobService that is imported for saving rules.
jest.mock('../../services/job_service.js', () => 'mlJobService');

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { ScopeExpression } from './scope_expression';
import { FILTER_TYPE } from '../../../common/constants/detector_rule';

describe('ScopeExpression', () => {
  const testFilterListIds = ['web_domains', 'safe_domains', 'uk_domains'];
  const updateScope = jest.fn(() => {});

  const requiredProps = {
    fieldName: 'domain',
    updateScope,
  };

  test('renders when no filter ID or type supplied', () => {
    const props = {
      ...requiredProps,
      filterListIds: testFilterListIds,
      enabled: true,
    };

    const component = shallowWithIntl(<ScopeExpression {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders when empty list of filter IDs is supplied', () => {
    const props = {
      ...requiredProps,
      filterListIds: [],
      enabled: true,
    };

    const component = shallowWithIntl(<ScopeExpression {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders when filter ID and type supplied', () => {
    const props = {
      ...requiredProps,
      filterListIds: testFilterListIds,
      filterId: 'safe_domains',
      filterType: FILTER_TYPE.INCLUDE,
      enabled: true,
    };

    const component = shallowWithIntl(<ScopeExpression {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders when enabled set to false', () => {
    const props = {
      ...requiredProps,
      filterListIds: testFilterListIds,
      filterId: 'safe_domains',
      filterType: FILTER_TYPE.INCLUDE,
      enabled: false,
    };

    const component = shallowWithIntl(<ScopeExpression {...props} />);

    expect(component).toMatchSnapshot();
  });
});
