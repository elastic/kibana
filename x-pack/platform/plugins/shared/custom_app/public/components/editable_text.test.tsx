/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import { renderApp } from './test_utils';

const document = appDocumentSchema.parse({
  state: { who: { type: 'string', default: 'Ana' } },
  root: { type: 'heading', id: 'title', text: 'Hello {{state.who}}' },
});

const noData = async () => ({ columns: [], rows: [] });
const change = jest.fn();

describe('words that can be changed where they are shown', () => {
  beforeEach(() => change.mockClear());

  const renderWith = (changeWords?: typeof change) =>
    renderApp(document, noData, undefined, { changeWords });

  it('are only shown when the page does not allow a change', async () => {
    await renderWith(undefined);

    expect(screen.getByText('Hello Ana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change this text' })).not.toBeInTheDocument();
  });

  it('turn into a field with the words as written, and keep what is written on Enter', async () => {
    await renderWith(change);

    await userEvent.click(screen.getByRole('button', { name: 'Change this text' }));
    const field = screen.getByRole('textbox', { name: 'Change this text' });
    expect(field).toHaveValue('Hello {{state.who}}');
    await userEvent.clear(field);
    await userEvent.type(field, 'Bye{Enter}');

    expect(change).toHaveBeenCalledWith('title', 'text', 'Bye');
  });

  it('are left as they were on Escape, or when nothing was changed or nothing is left', async () => {
    await renderWith(change);

    await userEvent.click(screen.getByRole('button', { name: 'Change this text' }));
    await userEvent.type(screen.getByRole('textbox'), 'x{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Change this text' }));
    await userEvent.tab();
    await userEvent.click(screen.getByRole('button', { name: 'Change this text' }));
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.tab();

    expect(change).not.toHaveBeenCalled();
  });
});
