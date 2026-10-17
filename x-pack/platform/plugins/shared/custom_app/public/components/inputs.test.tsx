/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import { SEARCH_DEBOUNCE_MS } from './search_node';
import { renderApp } from './test_utils';

const noData = async () => ({ columns: [], rows: [] });

const OPTIONS = [
  { value: 'all', label: 'All severities' },
  { value: 'high', label: 'High' },
  { value: 'low' },
];

const documentWith = (input: Record<string, unknown>, extraState: Record<string, unknown> = {}) =>
  appDocumentSchema.parse({
    state: {
      severity: { type: 'string', default: 'all' },
      other: { type: 'string', default: 'untouched' },
      ...extraState,
    },
    root: { id: 'input', label: 'Severity', bind: 'severity', ...input },
  });

describe('SelectNode', () => {
  const render = (extra: Record<string, unknown> = {}) =>
    renderApp(documentWith({ type: 'select', options: OPTIONS, ...extra }), noData);

  it('shows its label and options, with the bound state selected', async () => {
    await render();

    expect(screen.getByLabelText('Severity')).toHaveValue('all');
    expect(screen.getByRole('option', { name: 'All severities' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'low' })).toBeInTheDocument();
  });

  it('writes the chosen option to the bound state', async () => {
    const { runtime } = await render();

    await userEvent.selectOptions(screen.getByLabelText('Severity'), 'high');

    expect(runtime.state$.getValue().severity).toBe('high');
  });

  it('follows the state when something else changes it', async () => {
    const { runtime } = await render();

    act(() => {
      runtime.run([{ type: 'setState', key: 'severity', value: 'low' }]);
    });

    expect(screen.getByLabelText('Severity')).toHaveValue('low');
  });

  it('shows nothing selected when the state is none of the options', async () => {
    await renderApp(
      documentWith(
        { type: 'select', options: OPTIONS },
        { severity: { type: 'string', default: '' } }
      ),
      noData
    );

    expect(screen.getByLabelText('Severity')).toHaveValue('');
    OPTIONS.forEach(({ value, label }) => {
      expect(
        screen.getByRole('option', { name: label ?? value, selected: false })
      ).toBeInTheDocument();
    });
  });

  it('runs its own actions after writing the value, with the value as their input', async () => {
    const { runtime } = await render({
      onChange: [{ type: 'setState', key: 'other', value: { fromInput: true } }],
    });

    await userEvent.selectOptions(screen.getByLabelText('Severity'), 'low');

    expect(runtime.state$.getValue()).toEqual({ severity: 'low', other: 'low' });
  });
});

describe('ButtonGroupNode', () => {
  const render = (extra: Record<string, unknown> = {}) =>
    renderApp(documentWith({ type: 'button_group', options: OPTIONS, ...extra }), noData);

  it('shows one button per option, with the bound state pressed', async () => {
    await render();

    expect(screen.getByRole('group', { name: 'Severity' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All severities' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('writes the pressed option to the bound state and moves the selection', async () => {
    const { runtime } = await render();

    await userEvent.click(screen.getByRole('button', { name: 'High' }));

    expect(runtime.state$.getValue().severity).toBe('high');
    expect(screen.getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All severities' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('uses the value as the label when an option has none', async () => {
    await render();

    expect(screen.getByRole('button', { name: 'low' })).toBeInTheDocument();
  });
});

describe('SearchNode', () => {
  const render = (extra: Record<string, unknown> = {}) =>
    renderApp(documentWith({ type: 'search', placeholder: 'Find a service', ...extra }), noData);

  const typeAndWait = async (text: string) => {
    await userEvent.type(screen.getByRole('searchbox', { name: 'Severity' }), text);
  };

  beforeEach(() => jest.useFakeTimers({ advanceTimers: true }));
  afterEach(() => jest.useRealTimers());

  it('shows its placeholder and the bound state', async () => {
    await render();

    expect(screen.getByPlaceholderText('Find a service')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Severity' })).toHaveValue('all');
  });

  it('applies the text only once typing pauses', async () => {
    const { runtime } = await render();
    const box = screen.getByRole('searchbox', { name: 'Severity' });
    await userEvent.clear(box);

    await typeAndWait('chec');
    expect(runtime.state$.getValue().severity).toBe('all');

    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(runtime.state$.getValue().severity).toBe('chec');
  });

  it('writes once for a burst of typing, not once per key', async () => {
    const { runtime } = await render();
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Severity' }));
    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    const emissions: unknown[] = [];
    runtime.state$.subscribe((value) => emissions.push(value));

    await typeAndWait('cart');
    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(emissions).toHaveLength(2);
    expect(runtime.state$.getValue().severity).toBe('cart');
  });

  it('applies the text at once on Enter', async () => {
    const { runtime } = await render();
    const box = screen.getByRole('searchbox', { name: 'Severity' });
    await userEvent.clear(box);

    await userEvent.type(box, 'cart{Enter}');

    expect(runtime.state$.getValue().severity).toBe('cart');
  });

  it('follows the state when something else changes it', async () => {
    const { runtime } = await render();

    act(() => {
      runtime.run([{ type: 'setState', key: 'severity', value: 'from elsewhere' }]);
    });

    expect(screen.getByRole('searchbox', { name: 'Severity' })).toHaveValue('from elsewhere');
  });

  it('does not write back a change it only just received', async () => {
    const { runtime } = await render();
    const emissions: unknown[] = [];
    runtime.state$.subscribe((value) => emissions.push(value));

    act(() => {
      runtime.run([{ type: 'setState', key: 'severity', value: 'from elsewhere' }]);
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);
    });

    expect(emissions).toHaveLength(2);
  });

  it('limits how much can be typed to what state can hold', async () => {
    await render();

    expect(screen.getByRole('searchbox', { name: 'Severity' })).toHaveAttribute(
      'maxlength',
      '1000'
    );
  });
});
