/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormContext } from 'react-hook-form';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERTING_V2_INTERNAL_ACTION_POLICY_ROUTING_TAGS_API_PATH } from '@kbn/alerting-v2-constants';
import type { ActionPolicyRoutingTagsResponse } from '@kbn/alerting-v2-schemas';
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

const emptyResponse: ActionPolicyRoutingTagsResponse = {
  items: [],
  total_tags: 0,
  is_truncated: false,
};

const suggestionsResponse: ActionPolicyRoutingTagsResponse = {
  items: [
    {
      tag: 'rna',
      policy_count: 7,
      policies: ['A', 'B', 'C', 'D', 'E'].map((name) => ({ id: `id-${name}`, name })),
    },
    { tag: 'sre', policy_count: 1, policies: [{ id: 'id-sre', name: 'SRE on call' }] },
  ],
  total_tags: 2,
  is_truncated: false,
};

const renderRoutingTagsField = ({
  values,
  withSubmit = false,
  response = emptyResponse,
}: {
  values?: Partial<FormValues>;
  withSubmit?: boolean;
  response?: ActionPolicyRoutingTagsResponse | Error;
} = {}) => {
  const http = httpServiceMock.createStartContract();
  if (response instanceof Error) {
    http.get.mockRejectedValue(response);
  } else {
    http.get.mockResolvedValue(response);
  }
  const services = { ...createMockServices(), http };
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

  it('requests the routing tags used by action policies', async () => {
    const { services } = renderRoutingTagsField();

    await waitFor(() => {
      expect(services.http.get).toHaveBeenCalledWith(
        ALERTING_V2_INTERNAL_ACTION_POLICY_ROUTING_TAGS_API_PATH,
        { query: { search: undefined } }
      );
    });
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

  describe('suggestions', () => {
    const openSuggestions = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('combobox'));
      await screen.findByTestId('ruleRoutingTagOption-rna');
    };

    it('shows each tag with its policy names and a count badge', async () => {
      const user = userEvent.setup();
      renderRoutingTagsField({ response: suggestionsResponse });

      await openSuggestions(user);

      const rna = screen.getByTestId('ruleRoutingTagOption-rna');
      expect(within(rna).getByText('rna')).toBeInTheDocument();
      expect(within(rna).getByTestId('ruleRoutingTagOptionPolicies')).toHaveTextContent(
        'A, B, C, D, E, …'
      );
      expect(within(rna).getByTestId('ruleRoutingTagOptionCount')).toHaveTextContent('7');

      const sre = screen.getByTestId('ruleRoutingTagOption-sre');
      expect(within(sre).getByTestId('ruleRoutingTagOptionPolicies')).toHaveTextContent(
        /^SRE on call$/
      );
      expect(within(sre).getByTestId('ruleRoutingTagOptionCount')).toHaveTextContent('1');
    });

    it('gives each suggestion an accessible label with the full count', async () => {
      const user = userEvent.setup();
      renderRoutingTagsField({ response: suggestionsResponse });

      await openSuggestions(user);

      expect(
        screen.getByRole('option', { name: 'rna, 7 action policies: A, B, C, D, E, and 2 more' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'sre, 1 action policy: SRE on call' })
      ).toBeInTheDocument();
    });

    it('selects a suggested routing tag', async () => {
      const user = userEvent.setup();
      renderRoutingTagsField({ response: suggestionsResponse });

      await openSuggestions(user);
      await user.click(screen.getByTestId('ruleRoutingTagOption-sre'));

      expect(selectedPills()).toEqual(['sre']);
    });

    it('does not offer a routing tag that is already selected', async () => {
      const user = userEvent.setup();
      renderRoutingTagsField({
        values: formWithRoutingTags(['sre']),
        response: suggestionsResponse,
      });

      await openSuggestions(user);

      expect(screen.queryByTestId('ruleRoutingTagOption-sre')).not.toBeInTheDocument();
      expect(screen.getByTestId('ruleRoutingTagOption-rna')).toBeInTheDocument();
    });

    it('does not offer a suggestion again after it is selected', async () => {
      const user = userEvent.setup();
      renderRoutingTagsField({ response: suggestionsResponse });

      await openSuggestions(user);
      await user.click(screen.getByTestId('ruleRoutingTagOption-sre'));
      await user.click(screen.getByRole('combobox'));

      expect(await screen.findByTestId('ruleRoutingTagOption-rna')).toBeInTheDocument();
      expect(screen.queryByTestId('ruleRoutingTagOption-sre')).not.toBeInTheDocument();
      expect(selectedPills()).toEqual(['sre']);
    });

    it('adds a typed routing tag that differs from a selected one only by case', async () => {
      const user = userEvent.setup();
      renderRoutingTagsField({
        values: formWithRoutingTags(['rna']),
        response: suggestionsResponse,
      });

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByRole('combobox'), 'RNA{Enter}');

      expect(selectedPills()).toEqual(['rna', 'RNA']);
    });

    it('searches with the typed text', async () => {
      const user = userEvent.setup();
      const { services } = renderRoutingTagsField({ response: suggestionsResponse });

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByRole('combobox'), 'sr');

      await waitFor(() => {
        expect(services.http.get).toHaveBeenCalledWith(
          ALERTING_V2_INTERNAL_ACTION_POLICY_ROUTING_TAGS_API_PATH,
          { query: { search: 'sr' } }
        );
      });
    });

    it('still accepts a typed routing tag that no policy uses', async () => {
      const user = userEvent.setup();
      renderRoutingTagsField({ response: suggestionsResponse });

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByRole('combobox'), 'brand-new{Enter}');

      expect(selectedPills()).toEqual(['brand-new']);
    });

    it('still accepts typed routing tags and submits when the route fails', async () => {
      const user = userEvent.setup();
      const { services } = renderRoutingTagsField({
        response: new Error('Forbidden'),
        withSubmit: true,
      });
      await waitFor(() => expect(services.http.get).toHaveBeenCalled());

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByRole('combobox'), 'sre{Enter}');
      await user.click(screen.getByTestId('submitButton'));

      expect(selectedPills()).toEqual(['sre']);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText(/must be no longer|up to 20/)).not.toBeInTheDocument();
    });
  });
});
