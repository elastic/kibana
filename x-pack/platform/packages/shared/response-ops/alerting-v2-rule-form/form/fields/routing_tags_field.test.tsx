/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { RoutingTagsField } from './routing_tags_field';
import { createFormWrapper, createMockServices } from '../../test_utils';

const formWithRoutingTags = (routingTags: string[]): Partial<FormValues> => ({
  metadata: { name: 'Test Rule', enabled: true, routingTags },
});

const SubmitButton = () => {
  const { handleSubmit } = useFormContext();
  return (
    <button type="button" onClick={handleSubmit(() => {})} data-test-subj="submitButton">
      Submit
    </button>
  );
};

const selectedPills = () =>
  screen
    .queryAllByTestId('euiComboBoxPill')
    .map((pill) => pill.getAttribute('title') ?? pill.textContent);

const renderRoutingTagsField = ({
  values,
  withSubmit = false,
}: { values?: Partial<FormValues>; withSubmit?: boolean } = {}) => {
  const services = createMockServices();
  render(
    <>
      <RoutingTagsField />
      {withSubmit ? <SubmitButton /> : null}
    </>,
    { wrapper: createFormWrapper(values, services) }
  );
  return { services };
};

describe('RoutingTagsField', () => {
  it('renders the label, optional text and help text', () => {
    renderRoutingTagsField();

    expect(screen.getByText('Routing tags')).toBeInTheDocument();
    expect(screen.getByText('optional')).toBeInTheDocument();
    expect(
      screen.getByText('Action policies apply when they share at least one of these routing tags.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('ruleRoutingTagsInput')).toBeInTheDocument();
  });

  it('renders existing routing tags as selected options', () => {
    renderRoutingTagsField({ values: formWithRoutingTags(['sre', 'payments']) });

    expect(selectedPills()).toEqual(['sre', 'payments']);
  });

  it('does not request suggestions', () => {
    const { services } = renderRoutingTagsField();

    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('offers the typed value as a routing tag to add', async () => {
    const user = userEvent.setup();
    renderRoutingTagsField();

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'sre');

    expect(await screen.findByText(/as a routing tag/)).toBeInTheDocument();
  });

  it('adds several typed routing tags', async () => {
    const user = userEvent.setup();
    renderRoutingTagsField();

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'sre{Enter}');
    await user.type(screen.getByRole('combobox'), 'payments{Enter}');

    expect(selectedPills()).toEqual(['sre', 'payments']);
  });

  it('trims typed routing tags and ignores duplicates', async () => {
    const user = userEvent.setup();
    renderRoutingTagsField({ values: formWithRoutingTags(['sre']) });

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), '  sre  {Enter}');

    expect(selectedPills()).toEqual(['sre']);
  });

  it('shows a validation error on submit when more than 20 routing tags are set', async () => {
    const user = userEvent.setup();
    renderRoutingTagsField({
      values: formWithRoutingTags(Array.from({ length: 21 }, (_, i) => `route-${i}`)),
      withSubmit: true,
    });

    await user.click(screen.getByTestId('submitButton'));

    expect(await screen.findByText('You can add up to 20 tags.')).toBeInTheDocument();
  });

  it('shows a validation error on submit when a routing tag is longer than 128 characters', async () => {
    const user = userEvent.setup();
    renderRoutingTagsField({ values: formWithRoutingTags(['a'.repeat(129)]), withSubmit: true });

    await user.click(screen.getByTestId('submitButton'));

    expect(
      await screen.findByText('Each tag must be no longer than 128 characters.')
    ).toBeInTheDocument();
  });
});
