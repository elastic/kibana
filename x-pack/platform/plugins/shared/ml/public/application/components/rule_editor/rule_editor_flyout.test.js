/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock the services required for reading and writing job data.
jest.mock('../../services/job_service', () => ({
  mlJobServiceFactory: () => ({
    getJob: () => {
      return {
        job_id: 'farequote_no_by',
        description: 'Overall response time',
        analysis_config: {
          bucket_span: '5m',
          detectors: [
            {
              detector_description: 'mean(responsetime)',
              function: 'mean',
              field_name: 'responsetime',
              detector_index: 0,
            },
            {
              detector_description: 'min(responsetime)',
              function: 'max',
              field_name: 'responsetime',
              detector_index: 1,
              custom_rules: [
                {
                  actions: ['skip_result'],
                  conditions: [
                    {
                      applies_to: 'diff_from_typical',
                      operator: 'lte',
                      value: 123,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
    },
  }),
}));
jest.mock('../../capabilities/check_capabilities', () => ({
  checkPermission: () => true,
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (comp) => {
    return comp;
  },
}));

jest.mock('./select_rule_action', () => ({
  SelectRuleAction: jest.fn().mockImplementation(({ job, anomaly }) => {
    const React = jest.requireActual('react');
    return React.createElement(
      'div',
      { 'data-testid': 'mock-select-rule-action' },
      `Mock SelectRuleAction for job ${job?.job_id} and detector ${anomaly?.detectorIndex}`
    );
  }),
}));

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { RuleEditorFlyout } from './rule_editor_flyout';

describe('RuleEditorFlyout', () => {
  // Common props used across all tests
  const getRequiredProps = () => ({
    setShowFunction: jest.fn(),
    unsetShowFunction: jest.fn(),
    kibana: {
      services: {
        docLinks: {
          links: {
            ml: {
              customRules: 'jest-metadata-mock-url',
            },
          },
        },
        mlServices: { mlApi: {} },
        notifications: {
          toasts: {
            addDanger: jest.fn(),
          },
        },
      },
    },
  });

  test(`don't render when not opened`, () => {
    const { container } = renderWithI18n(<RuleEditorFlyout {...getRequiredProps()} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
