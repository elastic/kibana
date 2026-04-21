/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormWrapper } from '../../test_utils';
import { RuleDetailsFieldGroup } from './rule_details_field_group';

describe('RuleDetailsFieldGroup', () => {
  it('renders without a field group wrapper', () => {
    const Wrapper = createFormWrapper();

    const { container } = render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    // Should not render the FieldGroup panel
    expect(container.querySelector('.euiSplitPanel')).not.toBeInTheDocument();
    // Should not render a "Rule details" title
    expect(screen.queryByText('Rule details')).not.toBeInTheDocument();
  });

  it('renders the tags field with optional label', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('optional')).toBeInTheDocument();
  });

  it('renders the add description button initially', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Add description')).toBeInTheDocument();
  });

  it('renders the description field when add description is clicked', async () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    await userEvent.click(screen.getByText('Add description'));

    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('does not render enabled or kind fields', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(screen.queryByText('Enabled')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByText('Rule kind')).not.toBeInTheDocument();
    expect(screen.queryByText('Alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Monitor')).not.toBeInTheDocument();
  });
});
