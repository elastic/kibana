/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RulePageShowRequestModal } from './rule_page_show_request_modal';
import type { RuleFormData } from '../types';
import userEvent from '@testing-library/user-event';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormScreenContext: jest.fn(),
}));

const { useRuleFormState, useRuleFormScreenContext } = jest.requireMock('../hooks');

const formData: RuleFormData = {
  params: {
    searchType: 'esQuery',
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [1000],
    thresholdComparator: '>',
    size: 100,
    esQuery: '{\n    "query":{\n      "match_all" : {}\n    }\n  }',
    aggType: 'count',
    groupBy: 'all',
    termSize: 5,
    excludeHitsFromPreviousRun: false,
    sourceFields: [],
    index: ['.kibana'],
    timeField: 'created_at',
  },
  actions: [],
  consumer: 'stackAlerts',
  ruleTypeId: '.es-query',
  schedule: { interval: '1m' },
  tags: ['test'],
  name: 'test',
};

const onCloseMock = jest.fn();

describe('rulePageShowRequestModal', () => {
  beforeEach(() => {
    useRuleFormScreenContext.mockReturnValue({
      isShowRequestScreenVisible: false,
      setIsShowRequestScreenVisible: onCloseMock,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders create request correctly', async () => {
    useRuleFormState.mockReturnValue({ formData, multiConsumerSelection: 'logs' });

    render(<RulePageShowRequestModal />);

    expect(screen.getByTestId('modalHeaderTitle').textContent).toBe('Create alerting rule request');
    expect(screen.getByTestId('modalSubtitle').textContent).toBe(
      'This Kibana request will create this rule.'
    );
    expect(screen.queryByTestId('showRequestCreateTab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('showRequestUpdateTab')).not.toBeInTheDocument();
    expect(screen.getByTestId('modalRequestCodeBlock').textContent).toMatchInlineSnapshot(`
      "POST kbn:/api/alerting/rule
      {
        \\"params\\": {
          \\"searchType\\": \\"esQuery\\",
          \\"timeWindowSize\\": 5,
          \\"timeWindowUnit\\": \\"m\\",
          \\"threshold\\": [
            1000
          ],
          \\"thresholdComparator\\": \\">\\",
          \\"size\\": 100,
          \\"esQuery\\": \\"{\\\\n    \\\\\\"query\\\\\\":{\\\\n      \\\\\\"match_all\\\\\\" : {}\\\\n    }\\\\n  }\\",
          \\"aggType\\": \\"count\\",
          \\"groupBy\\": \\"all\\",
          \\"termSize\\": 5,
          \\"excludeHitsFromPreviousRun\\": false,
          \\"sourceFields\\": [],
          \\"index\\": [
            \\".kibana\\"
          ],
          \\"timeField\\": \\"created_at\\"
        },
        \\"consumer\\": \\"logs\\",
        \\"schedule\\": {
          \\"interval\\": \\"1m\\"
        },
        \\"tags\\": [
          \\"test\\"
        ],
        \\"name\\": \\"test\\",
        \\"rule_type_id\\": \\".es-query\\",
        \\"actions\\": []
      }"
    `);
  });

  test('renders tabs and defaults to create view when id is present', () => {
    useRuleFormState.mockReturnValue({
      formData,
      multiConsumerSelection: 'logs',
      id: 'test-id',
    });

    render(<RulePageShowRequestModal />);

    expect(screen.getByTestId('showRequestCreateTab')).toBeInTheDocument();
    expect(screen.getByTestId('showRequestUpdateTab')).toBeInTheDocument();
    expect(screen.getByTestId('showRequestCreateTab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('showRequestUpdateTab')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('modalSubtitle').textContent).toBe(
      'This Kibana request will create this rule.'
    );
    expect(screen.getByTestId('modalHeaderTitle').textContent).toBe('Create alerting rule request');
    expect(screen.getByTestId('modalRequestCodeBlock').textContent).toContain(
      'POST kbn:/api/alerting/rule'
    );
  });

  test('renders update request correctly for existing rule', async () => {
    useRuleFormState.mockReturnValue({
      formData,
      multiConsumerSelection: 'logs',
      id: 'test-id',
    });

    render(<RulePageShowRequestModal />);

    await userEvent.click(await screen.findByTestId('showRequestUpdateTab'));
    expect(screen.getByTestId('showRequestCreateTab')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('showRequestUpdateTab')).toHaveAttribute('aria-selected', 'true');

    expect(screen.getByTestId('modalHeaderTitle').textContent).toBe('Update alerting rule request');
    expect(screen.getByTestId('modalSubtitle').textContent).toBe(
      'This Kibana request will update this rule.'
    );
    expect(screen.getByTestId('modalRequestCodeBlock').textContent).toMatchInlineSnapshot(`
      "PUT kbn:/api/alerting/rule/test-id
      {
        \\"name\\": \\"test\\",
        \\"tags\\": [
          \\"test\\"
        ],
        \\"schedule\\": {
          \\"interval\\": \\"1m\\"
        },
        \\"params\\": {
          \\"searchType\\": \\"esQuery\\",
          \\"timeWindowSize\\": 5,
          \\"timeWindowUnit\\": \\"m\\",
          \\"threshold\\": [
            1000
          ],
          \\"thresholdComparator\\": \\">\\",
          \\"size\\": 100,
          \\"esQuery\\": \\"{\\\\n    \\\\\\"query\\\\\\":{\\\\n      \\\\\\"match_all\\\\\\" : {}\\\\n    }\\\\n  }\\",
          \\"aggType\\": \\"count\\",
          \\"groupBy\\": \\"all\\",
          \\"termSize\\": 5,
          \\"excludeHitsFromPreviousRun\\": false,
          \\"sourceFields\\": [],
          \\"index\\": [
            \\".kibana\\"
          ],
          \\"timeField\\": \\"created_at\\"
        },
        \\"actions\\": []
      }"
    `);
  });

  test('can close modal', () => {
    useRuleFormState.mockReturnValue({
      formData,
      multiConsumerSelection: 'logs',
      id: 'test-id',
    });

    render(<RulePageShowRequestModal />);
    fireEvent.click(screen.getByLabelText('Closes this modal window'));
    expect(onCloseMock).toHaveBeenCalled();
  });
});
