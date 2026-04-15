/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createFormWrapper } from '../../test_utils';
import { RuleDetailsFieldGroup } from './rule_details_field_group';

describe('RuleDetailsFieldGroup', () => {
  it('renders Rule details in a split panel field group', () => {
    const Wrapper = createFormWrapper();

    const { container } = render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(container.querySelector('.euiSplitPanel')).toBeInTheDocument();
    expect(screen.getByText('Rule details')).toBeInTheDocument();
  });

  it('renders name, description, and tags fields', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Rule name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
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
  });
});
