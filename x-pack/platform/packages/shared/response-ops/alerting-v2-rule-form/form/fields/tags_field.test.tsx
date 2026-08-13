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
import { TagsField, validateTags } from './tags_field';
import { createFormWrapper, createMockServices } from '../../test_utils';

describe('validateTags', () => {
  it('passes when tags are undefined or empty', () => {
    expect(validateTags(undefined)).toBe(true);
    expect(validateTags([])).toBe(true);
  });

  it('passes when a tag is exactly at the length limit', () => {
    expect(validateTags(['a'.repeat(128)])).toBe(true);
  });

  it('fails when a tag exceeds the length limit', () => {
    expect(validateTags(['a'.repeat(129)])).toBe('Each tag must be no longer than 128 characters.');
  });

  it('passes when exactly at the tag count limit', () => {
    expect(validateTags(Array.from({ length: 20 }, (_, i) => `tag-${i}`))).toBe(true);
  });

  it('fails when the tag count exceeds the limit', () => {
    expect(validateTags(Array.from({ length: 21 }, (_, i) => `tag-${i}`))).toBe(
      'You can add up to 20 tags.'
    );
  });

  it('reports the length error before the count error', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag-${i}`);
    tags[0] = 'a'.repeat(129);
    expect(validateTags(tags)).toBe('Each tag must be no longer than 128 characters.');
  });
});

/** Helper that triggers form submission so react-hook-form runs validation. */
const SubmitButton = () => {
  const { handleSubmit } = useFormContext();
  return (
    <button type="button" onClick={handleSubmit(() => {})} data-test-subj="submitButton">
      Submit
    </button>
  );
};

// Failing: See https://github.com/elastic/kibana/issues/261209
describe.skip('TagsField', () => {
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
        tags: ['prod', 'critical'],
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

  it('shows validation error on submit when a tag exceeds 128 characters', async () => {
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
    await user.type(input, 'a'.repeat(129));
    await user.keyboard('{Enter}');

    await user.click(screen.getByTestId('submitButton'));

    await waitFor(() => {
      expect(
        screen.getByText('Each tag must be no longer than 128 characters.')
      ).toBeInTheDocument();
    });
  });

  it('passes validation when tags are exactly 128 characters', async () => {
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
    await user.type(input, 'b'.repeat(128));
    await user.keyboard('{Enter}');

    await user.click(screen.getByTestId('submitButton'));

    await waitFor(() => {
      expect(
        screen.queryByText('Each tag must be no longer than 128 characters.')
      ).not.toBeInTheDocument();
    });
  });

  it('shows validation error on submit when more than 20 tags are added', async () => {
    const user = userEvent.setup();
    const Wrapper = createFormWrapper({
      metadata: {
        name: 'Test Rule',
        enabled: true,
        tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
      },
    });

    render(
      <>
        <TagsField />
        <SubmitButton />
      </>,
      { wrapper: Wrapper }
    );

    await user.click(screen.getByTestId('submitButton'));

    await waitFor(() => {
      expect(screen.getByText('You can add up to 20 tags.')).toBeInTheDocument();
    });
  });

  it('passes validation when exactly 20 tags are added', async () => {
    const user = userEvent.setup();
    const Wrapper = createFormWrapper({
      metadata: {
        name: 'Test Rule',
        enabled: true,
        tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`),
      },
    });

    render(
      <>
        <TagsField />
        <SubmitButton />
      </>,
      { wrapper: Wrapper }
    );

    await user.click(screen.getByTestId('submitButton'));

    await waitFor(() => {
      expect(screen.queryByText('You can add up to 20 tags.')).not.toBeInTheDocument();
    });
  });

  it('renders correctly in flyout layout', () => {
    render(<TagsField />, {
      wrapper: createFormWrapper({}, createMockServices(), { layout: 'flyout' }),
    });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
