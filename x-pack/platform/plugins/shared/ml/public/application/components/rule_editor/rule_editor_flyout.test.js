/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

// Mock the services required for reading and writing job data.
const mockGetJob = vi.fn(() => ({
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
}));

vi.mock('../../services/job_service', () => {
  const mocked = {
    mlJobServiceFactory: () => ({
      getJob: mockGetJob,
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../capabilities/check_capabilities', () => {
  const mocked = {
    checkPermission: () => true,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = {
    withKibana: (comp) => {
      return comp;
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('./select_rule_action', () => {
  const mocked = {
    SelectRuleAction: vi.fn().mockImplementation(({ job, anomaly }) => {
      const React = require('react');
      return React.createElement(
        'div',
        { 'data-testid': 'mock-select-rule-action' },
        `Mock SelectRuleAction for job ${job?.job_id} and detector ${anomaly?.detectorIndex}`
      );
    }),
  };
  return { ...mocked, default: mocked };
});

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { RuleEditorFlyout } from './rule_editor_flyout';

describe('RuleEditorFlyout', () => {
  // Common props used across all tests
  const getRequiredProps = () => ({
    setShowFunction: vi.fn(),
    unsetShowFunction: vi.fn(),
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
            addDanger: vi.fn(),
          },
        },
      },
    },
  });

  const anomaly = {
    jobId: 'farequote_no_by',
    detectorIndex: 0,
    source: { function: 'mean' },
  };

  test(`don't render when not opened`, () => {
    const { container } = renderWithI18n(<RuleEditorFlyout {...getRequiredProps()} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('showFlyout reads job from mlJobService using the anomaly jobId', () => {
    let capturedShowFlyout;
    const props = {
      ...getRequiredProps(),
      setShowFunction: (fn) => {
        capturedShowFlyout = fn;
      },
    };

    renderWithI18n(<RuleEditorFlyout {...props} />);

    capturedShowFlyout(anomaly, {});

    // mlJobService.getJob should have been called with the anomaly's jobId
    expect(mockGetJob).toHaveBeenCalledWith(anomaly.jobId);
  });
});
