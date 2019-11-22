/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../services/job_service.js', () => 'mlJobService');

// Mock the call for loading a filter.
// The mock is hoisted to the top, so need to prefix the filter variable
// with 'mock' so it can be used lazily.
const mockTestFilter = {
  filter_id: 'eu-airlines',
  description: 'List of European airlines',
  items: ['ABA', 'AEL'],
  used_by: {
    detectors: ['mean response time'],
    jobs: ['farequote']
  },
};
jest.mock('../../../services/ml_api_service', () => ({
  ml: {
    filters: {
      filters: () => {
        return Promise.resolve(mockTestFilter);
      }
    }
  }
}));

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { RuleActionPanel } from './rule_action_panel';
import { ACTION } from '../../../../../common/constants/detector_rule';

describe('RuleActionPanel', () => {

  const job = {
    job_id: 'farequote',
    analysis_config: {
      detectors: [
        {
          detector_description: 'mean response time',
          custom_rules: [
            {
              actions: [
                ACTION.SKIP_RESULT
              ],
              conditions: [
                {
                  applies_to: 'actual',
                  operator: 'lt',
                  value: 1
                }
              ]
            },
            {
              actions: [
                ACTION.SKIP_MODEL_UPDATE
              ],
              scope: {
                airline: {
                  filter_id: 'eu-airlines',
                  filter_type: 'exclude'
                }
              }
            },
            {
              actions: [
                ACTION.SKIP_MODEL_UPDATE
              ],
              scope: {
                airline: {
                  filter_id: 'eu-airlines',
                  filter_type: 'exclude'
                }
              },
              conditions: [
                {
                  applies_to: 'actual',
                  operator: 'gt',
                  value: 500
                }
              ]
            },
          ],
          detector_index: 0
        }
      ]
    },
  };

  const anomaly = {
    actual: [50],
    typical: [1.23],
    detectorIndex: 0,
    source: {
      function: 'mean',
      airline: ['AAL'],
    },
  };

  const setEditRuleIndex = jest.fn(() => {});
  const updateRuleAtIndex = jest.fn(() => {});
  const deleteRuleAtIndex = jest.fn(() => {});
  const addItemToFilterList = jest.fn(() => {});

  const requiredProps = {
    job,
    anomaly,
    detectorIndex: 0,
    setEditRuleIndex,
    updateRuleAtIndex,
    deleteRuleAtIndex,
    addItemToFilterList,
  };

  test('renders panel for rule with a condition', () => {
    const props = {
      ...requiredProps,
      ruleIndex: 0,
    };

    const component = shallowWithIntl(
      <RuleActionPanel {...props} />
    );

    expect(component).toMatchSnapshot();

  });

  test('renders panel for rule with scope, value in filter list', () => {
    const props = {
      ...requiredProps,
      ruleIndex: 1,
    };

    const component = shallowWithIntl(
      <RuleActionPanel {...props} />
    );

    expect(component).toMatchSnapshot();

  });

  test('renders panel for rule with a condition and scope, value not in filter list', () => {
    const props = {
      ...requiredProps,
      ruleIndex: 1,
    };

    const wrapper = shallowWithIntl(
      <RuleActionPanel {...props} />
    );
    wrapper.setState({ showAddToFilterListLink: true });
    expect(wrapper).toMatchSnapshot();

  });

});
