/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Mock the mlJobService that is imported for saving rules.
jest.mock('../../services/job_service.js', () => 'mlJobService');

// Create a mock for the canGetFilters privilege check.
// The mock is hoisted to the top, so need to prefix the mock function
// with 'mock' so it can be used lazily.
const mockCheckPermission = jest.fn(() => true);
jest.mock('../../privilege/check_privilege', () => ({
  checkPermission: privilege => mockCheckPermission(privilege),
}));

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { ScopeSection } from './scope_section';
import { FILTER_TYPE } from '../../../../common/constants/detector_rule';

describe('ScopeSection', () => {
  const testFilterListIds = ['web_domains', 'safe_domains', 'uk_domains'];

  const testScope = {
    domain: {
      filter_id: 'uk_domains',
      filter_type: FILTER_TYPE.INCLUDE,
      enabled: true,
    },
  };

  const onEnabledChange = jest.fn(() => {});
  const updateScope = jest.fn(() => {});

  const requiredProps = {
    filterListIds: testFilterListIds,
    onEnabledChange,
    updateScope,
  };

  test('renders when not enabled', () => {
    const props = {
      ...requiredProps,
      partitioningFieldNames: ['domain'],
      isEnabled: false,
    };

    const component = shallowWithIntl(<ScopeSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test(`don't render when no partitioning fields`, () => {
    const props = {
      ...requiredProps,
      partitioningFieldNames: [],
      isEnabled: false,
    };

    const component = shallowWithIntl(<ScopeSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('show NoFilterListsCallOut when no filter list IDs', () => {
    const props = {
      ...requiredProps,
      partitioningFieldNames: ['domain'],
      filterListIds: [],
      isEnabled: true,
    };

    const component = shallowWithIntl(<ScopeSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders when enabled with no scope supplied', () => {
    const props = {
      ...requiredProps,
      partitioningFieldNames: ['domain'],
      isEnabled: true,
    };

    const component = shallowWithIntl(<ScopeSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders when enabled with scope supplied', () => {
    const props = {
      ...requiredProps,
      partitioningFieldNames: ['domain'],
      scope: testScope,
      isEnabled: true,
    };

    const component = shallowWithIntl(<ScopeSection {...props} />);

    expect(component).toMatchSnapshot();
  });
});

describe('ScopeSection false canGetFilters privilege', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const onEnabledChange = jest.fn(() => {});
  const updateScope = jest.fn(() => {});

  const requiredProps = {
    onEnabledChange,
    updateScope,
  };

  test('show NoPermissionCallOut when no filter list IDs', () => {
    mockCheckPermission.mockImplementationOnce(() => {
      return false;
    });

    const props = {
      ...requiredProps,
      partitioningFieldNames: ['domain'],
      filterListIds: [],
      isEnabled: true,
    };

    const component = shallowWithIntl(<ScopeSection {...props} />);

    expect(component).toMatchSnapshot();
  });
});
