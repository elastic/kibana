/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ItemValueRuleSummary } from './item_value_rule_summary';

describe('ItemValueRuleSummary', () => {
  it('renders the item value text', () => {
    const { getByText } = render(<ItemValueRuleSummary itemValue="logs-*" />);
    expect(getByText('logs-*')).toBeInTheDocument();
  });

  it('renders placeholder value', () => {
    const { getByText } = render(<ItemValueRuleSummary itemValue="-" />);
    expect(getByText('-')).toBeInTheDocument();
  });

  it('passes data-test-subj through to the wrapper', () => {
    const { container } = render(
      <ItemValueRuleSummary data-test-subj="myTestId" itemValue="value" />
    );
    expect(container.querySelector('[data-test-subj="myTestId"]')).toBeInTheDocument();
  });
});
