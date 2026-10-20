/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAX_QUERY_OPTIONS, appDocumentSchema } from '@kbn/custom-app-common';
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

describe('SelectNode with options from a query', () => {
  const optionsDocument = (
    extra: Record<string, unknown> = {},
    state: Record<string, unknown> = {}
  ) =>
    documentWith(
      {
        type: 'select',
        options: [{ value: 'all', label: 'All outcomes' }],
        optionsQuery: 'FROM logs | STATS BY event.outcome',
        ...extra,
      },
      state
    );

  const rowsOf = (rows: unknown[][], columns = ['value']) =>
    jest.fn(async () => ({
      columns: columns.map((name) => ({ name, type: 'keyword' })),
      rows,
    }));

  const optionNames = () => screen.getAllByRole('option').map(({ textContent }) => textContent);

  it('shows the options that are written, then the ones the query gave', async () => {
    await renderApp(optionsDocument(), rowsOf([['success'], ['failure']]));

    await waitFor(() => expect(optionNames()).toEqual(['All outcomes', 'success', 'failure']));
  });

  it('uses a second column as the label of an option', async () => {
    await renderApp(
      optionsDocument(),
      rowsOf(
        [
          ['s', 'Succeeded'],
          ['f', 'Failed'],
        ],
        ['value', 'label']
      )
    );

    await waitFor(() => expect(optionNames()).toEqual(['All outcomes', 'Succeeded', 'Failed']));
  });

  it('sets the value of the option, not its label, when one is chosen', async () => {
    const { runtime } = await renderApp(
      optionsDocument(),
      rowsOf([['s', 'Succeeded']], ['value', 'label'])
    );
    await waitFor(() => expect(optionNames()).toContain('Succeeded'));

    await userEvent.selectOptions(screen.getByLabelText('Severity'), 'Succeeded');

    expect(runtime.state$.getValue().severity).toBe('s');
  });

  it('leaves out an empty value, and one that is there already, whichever wrote it', async () => {
    await renderApp(
      optionsDocument(),
      rowsOf([[null], [''], ['all'], ['success'], ['success'], [7]])
    );

    await waitFor(() => expect(optionNames()).toEqual(['All outcomes', 'success', '7']));
  });

  it('takes no more than a person can look through', async () => {
    await renderApp(
      optionsDocument({ options: [] }, { severity: { type: 'string', default: '' } }),
      rowsOf(Array.from({ length: MAX_QUERY_OPTIONS + 50 }, (_, index) => [`v${index}`]))
    );

    await waitFor(() => expect(optionNames()).toHaveLength(MAX_QUERY_OPTIONS));
  });

  it('works with no options written at all', async () => {
    await renderApp(
      optionsDocument({ options: [] }, { severity: { type: 'string', default: '' } }),
      rowsOf([['success']])
    );

    await waitFor(() => expect(optionNames()).toEqual(['success']));
  });

  it('keeps the options that are written while the query is running, and says it is', async () => {
    let finish: (value: { columns: never[]; rows: unknown[][] }) => void = () => {};
    const pending = jest.fn(
      () => new Promise<{ columns: never[]; rows: unknown[][] }>((resolve) => (finish = resolve))
    );
    renderApp(optionsDocument(), pending as never);

    expect(await screen.findByRole('option', { name: 'All outcomes' })).toBeInTheDocument();
    expect(optionNames()).toEqual(['All outcomes']);

    await act(async () => finish({ columns: [], rows: [['success']] }));
    await waitFor(() => expect(optionNames()).toEqual(['All outcomes', 'success']));
  });

  it('says why the options could not be had, and keeps the ones that are written', async () => {
    await renderApp(
      optionsDocument(),
      jest.fn(async () => {
        throw new Error('index_not_found_exception');
      })
    );

    expect(
      await screen.findByText(/The options could not be loaded: index_not_found_exception/)
    ).toBeInTheDocument();
    expect(optionNames()).toEqual(['All outcomes']);
  });

  it('runs the query again when a value it uses changes, so that one select can narrow another', async () => {
    const runQuery = jest.fn(
      async (_query: string, request: { state: Record<string, unknown> }) => ({
        columns: [{ name: 'value', type: 'keyword' }],
        rows: request.state.other === 'a' ? [['one']] : [['two']],
      })
    );
    const { runtime } = await renderApp(
      optionsDocument(
        { optionsQuery: 'FROM logs | WHERE service == ?other | STATS BY event.outcome' },
        { other: { type: 'string', default: 'a' } }
      ),
      runQuery as never
    );
    await waitFor(() => expect(optionNames()).toEqual(['All outcomes', 'one']));

    act(() => {
      runtime.run([{ type: 'setState', key: 'other', value: 'b' }]);
    });

    await waitFor(() => expect(optionNames()).toEqual(['All outcomes', 'two']));
  });

  it('shows a value that is not one of the options as what it is, not as the first option', async () => {
    await renderApp(
      optionsDocument({}, { severity: { type: 'string', default: 'gone' } }),
      rowsOf([['success']])
    );
    await waitFor(() => expect(optionNames()).toContain('success'));

    expect(screen.getByLabelText('Severity')).toHaveValue('gone');
    expect(optionNames()).toEqual(['All outcomes', 'success', 'gone']);
  });

  it('shows an empty value as nothing chosen', async () => {
    await renderApp(
      optionsDocument({}, { severity: { type: 'string', default: '' } }),
      rowsOf([['success']])
    );
    await waitFor(() => expect(optionNames()).toContain('success'));

    expect(screen.getByLabelText('Severity')).toHaveValue('');
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
