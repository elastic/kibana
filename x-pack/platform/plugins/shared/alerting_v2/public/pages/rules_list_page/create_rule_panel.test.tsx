/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createQueryClientWrapper } from '@kbn/react-query';
import { CreateRulePanel } from './create_rule_panel';

describe('CreateRulePanel', () => {
  it('should render', () => {
    render(<CreateRulePanel onClose={jest.fn()} />, { wrapper: createQueryClientWrapper() });
    expect(
      screen.getByRole('heading', { level: 2, name: 'Create Rule' })
    ).toBeInTheDocument<HTMLHeadingElement>();
    expect(
      screen.getByText('Create a new rule to start monitoring your data.')
    ).toBeInTheDocument();
  });
});
