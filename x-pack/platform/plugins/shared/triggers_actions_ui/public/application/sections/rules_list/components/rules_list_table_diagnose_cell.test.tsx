/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { RuleTableItem } from '../../../../types';
import { RulesListTableDiagnoseCell } from './rules_list_table_diagnose_cell';

const healthyRule = {
  id: '1',
  enabled: true,
  tags: [],
  executionStatus: { status: 'ok' },
  lastRun: { outcome: 'succeeded' },
} as unknown as RuleTableItem;

describe('RulesListTableDiagnoseCell', () => {
  const onDiagnoseClick = jest.fn();

  afterEach(() => {
    onDiagnoseClick.mockClear();
  });

  it('renders nothing for a healthy rule', () => {
    const { container } = render(
      <RulesListTableDiagnoseCell rule={healthyRule} onDiagnoseClick={onDiagnoseClick} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a danger button for a failed rule and reports the rule on click', () => {
    const failedRule = {
      ...healthyRule,
      executionStatus: { status: 'error' },
      lastRun: { outcome: 'failed' },
    } as unknown as RuleTableItem;
    const { getByTestId } = render(
      <RulesListTableDiagnoseCell rule={failedRule} onDiagnoseClick={onDiagnoseClick} />
    );

    const button = getByTestId('ruleDiagnoseButton');
    expect(button.className).toContain('danger');

    fireEvent.click(button);
    expect(onDiagnoseClick).toHaveBeenCalledWith(failedRule);
  });

  it('renders a warning button for a rule with a warning', () => {
    const warningRule = {
      ...healthyRule,
      executionStatus: { status: 'warning' },
      lastRun: { outcome: 'warning' },
    } as unknown as RuleTableItem;
    const { getByTestId } = render(
      <RulesListTableDiagnoseCell rule={warningRule} onDiagnoseClick={onDiagnoseClick} />
    );
    expect(getByTestId('ruleDiagnoseButton').className).toContain('warning');
  });

  it('renders a button for a healthy rule missing its API key', () => {
    const { getByTestId } = render(
      <RulesListTableDiagnoseCell
        rule={{ ...healthyRule, tags: ['Missing Elastic Cloud API Key'] } as RuleTableItem}
        onDiagnoseClick={onDiagnoseClick}
      />
    );
    expect(getByTestId('ruleDiagnoseButton')).toBeInTheDocument();
  });
});
