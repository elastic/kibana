/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormContext } from 'react-hook-form';
import { TagsField } from './tags_field';
import { createFormWrapper, createMockServices } from '../../test_utils';

/** Helper that triggers form submission so react-hook-form runs validation. */
const SubmitButton = () => {
  const { handleSubmit } = useFormContext();
  return (
    <button type="button" onClick={handleSubmit(() => {})} data-test-subj="submitButton">
      Submit
    </button>
  );
};

describe('TagsField', () => {
  it('renders the tags label and optional text', () => {
    render(<TagsField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('optional')).toBeInTheDocument();
  });

  it('renders the combo box', () => {
    render(<TagsField />, { wrapper: createFormWrapper() });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders existing tags as selected options', () => {
    const Wrapper = createFormWrapper({
      metadata: {
        name: 'Test Rule',
        enabled: true,
        labels: ['prod', 'critical'],
      },
    });

    render(<TagsField />, { wrapper: Wrapper });

    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('allows creating a new tag', async () => {
    const user = userEvent.setup();
    render(<TagsField />, { wrapper: createFormWrapper() });

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'new-tag');
    await user.keyboard('{Enter}');

    expect(screen.getByText('new-tag')).toBeInTheDocument();
  });

  it('shows validation error on submit when a tag exceeds 64 characters', async () => {
    const user = userEvent.setup();
    const Wrapper = createFormWrapper();

    render(
      <>
        <TagsField />
        <SubmitButton />
      </>,
      { wrapper: Wrapper }
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'a'.repeat(65));
    await user.keyboard('{Enter}');

    await user.click(screen.getByTestId('submitButton'));

    await waitFor(() => {
      expect(
        screen.getByText('Each tag must be no longer than 64 characters.')
      ).toBeInTheDocument();
    });
  });

  it('passes validation when tags are exactly 64 characters', async () => {
    const user = userEvent.setup();
    const Wrapper = createFormWrapper();

    render(
      <>
        <TagsField />
        <SubmitButton />
      </>,
      { wrapper: Wrapper }
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'b'.repeat(64));
    await user.keyboard('{Enter}');

    await user.click(screen.getByTestId('submitButton'));

    await waitFor(() => {
      expect(
        screen.queryByText('Each tag must be no longer than 64 characters.')
      ).not.toBeInTheDocument();
    });
  });

  it('renders correctly in flyout layout', () => {
    render(<TagsField />, {
      wrapper: createFormWrapper({}, createMockServices(), { layout: 'flyout' }),
    });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
