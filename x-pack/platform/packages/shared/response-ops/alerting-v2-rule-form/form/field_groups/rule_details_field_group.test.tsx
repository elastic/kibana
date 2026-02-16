/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { FormValues } from '../types';
import { RuleDetailsFieldGroup } from './rule_details_field_group';

const createWrapper = (defaultValues: Partial<FormValues> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const form = useForm<FormValues>({
      defaultValues: {
        kind: 'alert',
        metadata: {
          name: '',
          enabled: true,
        },
        timeField: '@timestamp',
        schedule: { every: '5m' },
        evaluation: {
          query: {
            base: '',
          },
        },
        ...defaultValues,
      },
    });

    return (
      <QueryClientProvider client={queryClient}>
        <FormProvider {...form}>{children}</FormProvider>
      </QueryClientProvider>
    );
  };

  return Wrapper;
};

describe('RuleDetailsFieldGroup', () => {
  it('renders the field group with title', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Rule details')).toBeInTheDocument();
  });

  it('renders the name field', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
  });

  it('renders the labels field', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Labels')).toBeInTheDocument();
  });

  it('renders the add description button initially', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Add description')).toBeInTheDocument();
  });

  it('renders the description field when add description is clicked', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    await userEvent.click(screen.getByText('Add description'));

    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('renders the enabled field', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders the kind field', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    // "Rule kind" appears in both label and legend (for screen readers)
    expect(screen.getAllByText('Rule kind').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });

  it('allows entering a name', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.type(nameInput, 'My Test Rule');

    expect(nameInput).toHaveValue('My Test Rule');
  });

  it('allows toggling enabled state', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked();

    await userEvent.click(toggle);

    expect(toggle).not.toBeChecked();
  });

  it('allows switching rule kind', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    // Default is 'alert', so Alert button should be selected
    const monitorButton = screen.getByText('Monitor');
    await userEvent.click(monitorButton);

    // The button group should now have Monitor selected
    expect(monitorButton.closest('button')).toHaveClass('euiButtonGroupButton-isSelected');
  });

  it('renders with pre-filled values', () => {
    const Wrapper = createWrapper({
      metadata: {
        name: 'Pre-filled Rule',
        enabled: false,
      },
      kind: 'signal',
    });

    render(
      <Wrapper>
        <RuleDetailsFieldGroup />
      </Wrapper>
    );

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Pre-filled Rule');
    // Monitor should be selected (signal maps to monitor)
    expect(screen.getByText('Monitor').closest('button')).toHaveClass(
      'euiButtonGroupButton-isSelected'
    );
  });
});
