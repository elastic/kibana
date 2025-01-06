/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tags } from './tags';
import { ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public';

describe('Tags', () => {
  const onChange = jest.fn();

  const options = {
    values: [],
    onChange,
    executionMode: ActionConnectorMode.ActionForm,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders tags initially', () => {
    render(<Tags {...{ ...options, values: ['super', 'hello'] }} />);

    expect(screen.getByText('super')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('clears the tags', async () => {
    render(<Tags {...{ ...options, values: ['super', 'hello'] }} />);

    await waitFor(() => {
      expect(screen.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    await userEvent.click(screen.getByTestId('comboBoxClearButton'));

    await waitFor(() =>
      expect(onChange.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "tags",
          Array [],
        ]
      `)
    );
  });

  it('calls onChange when removing a tag', async () => {
    render(<Tags {...{ ...options, values: ['super', 'hello'] }} />);

    await waitFor(() => {
      expect(screen.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    await userEvent.click(screen.getByTitle('Remove super from selection in this group'));

    await waitFor(() =>
      expect(onChange.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "tags",
          Array [
            "hello",
          ],
        ]
      `)
    );
  });

  it('calls onChange when adding a tag', async () => {
    render(<Tags {...options} />);

    await waitFor(() => {
      expect(screen.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    await userEvent.click(screen.getByTestId('comboBoxSearchInput'));

    await userEvent.type(screen.getByTestId('comboBoxSearchInput'), 'awesome{enter}');

    await waitFor(() =>
      expect(onChange.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "tags",
          Array [
            "awesome",
          ],
        ]
      `)
    );
  });

  it('shows the rule tags as an option to select', async () => {
    render(<Tags {...options} />);

    await waitFor(() => {
      expect(screen.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    await userEvent.click(screen.getByTestId('comboBoxSearchInput'));

    await waitFor(() => {
      expect(screen.getByTestId('opsgenie-tags-rule-tags')).toBeInTheDocument();
      expect(screen.getByText('The tags of the rule.')).toBeInTheDocument();
    });
  });

  it('calls onChange when clicking the rule tags option', async () => {
    render(<Tags {...options} />);

    await waitFor(() => {
      expect(screen.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    await userEvent.click(screen.getByTestId('comboBoxSearchInput'));

    await waitFor(() => {
      expect(screen.getByTestId('opsgenie-tags-rule-tags')).toBeInTheDocument();
      expect(screen.getByText('The tags of the rule.')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('The tags of the rule.'), { pointerEventsCheck: 0 });

    await waitFor(() =>
      expect(onChange.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "tags",
        Array [
          "{{rule.tags}}",
        ],
      ]
    `)
    );
  });

  it('does not contain the rule.tags option when in test mode', async () => {
    render(<Tags {...{ ...options, executionMode: ActionConnectorMode.Test }} />);

    await waitFor(() => {
      expect(screen.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    await userEvent.click(screen.getByTestId('comboBoxSearchInput'));

    await waitFor(() => {
      expect(screen.queryByTestId('opsgenie-tags-rule-tags')).not.toBeInTheDocument();
      expect(screen.queryByText('The tags of the rule.')).not.toBeInTheDocument();
    });
  });
});
