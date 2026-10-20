/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAX_LIST_ITEMS, MAX_STATE_STRING_LENGTH, appDocumentSchema } from '@kbn/custom-app-common';
import { LIST_INPUT_DEBOUNCE_MS, parseLines } from './list_input_node';
import { renderApp } from './test_utils';

const noData = async () => ({ columns: [], rows: [] });

const documentWith = (
  extra: Record<string, unknown> = {},
  users: string[] = [],
  state: Record<string, unknown> = {}
) =>
  appDocumentSchema.parse({
    state: {
      users: { type: 'list', default: users },
      other: { type: 'list', default: [] },
      ...state,
    },
    root: {
      type: 'list_input',
      id: 'box',
      label: 'Usernames',
      bind: 'users',
      placeholder: 'One per line',
      ...extra,
    },
  });

const render = (extra: Record<string, unknown> = {}, users: string[] = []) =>
  renderApp(documentWith(extra, users), noData);

const box = () => screen.getByRole('textbox', { name: 'Usernames' });

/** Types a text that has line breaks in it, which `type` takes as `{Enter}`. */
const write = async (text: string) => {
  await userEvent.clear(box());
  await userEvent.type(box(), text.replace(/\n/g, '{Enter}'));
};

describe('the lines of a box', () => {
  it('are the values written, without spaces around them, empty lines or repeats, in the order first written', () => {
    expect(parseLines(' matt \n\nroute\r\nmatt\n   \nroute\nzed')).toEqual([
      'matt',
      'route',
      'zed',
    ]);
  });

  it('are cut to what a value can be', () => {
    expect(parseLines('x'.repeat(MAX_STATE_STRING_LENGTH + 50))[0]).toHaveLength(
      MAX_STATE_STRING_LENGTH
    );
  });

  it('are nothing for an empty box', () => {
    expect(parseLines('')).toEqual([]);
    expect(parseLines('\n \n')).toEqual([]);
  });
});

describe('ListInputNode', () => {
  beforeEach(() => jest.useFakeTimers({ advanceTimers: true }));
  afterEach(() => jest.useRealTimers());

  it('shows its label and placeholder, and how many values it holds', async () => {
    await render();

    expect(box()).toHaveAttribute('placeholder', 'One per line');
    expect(screen.getByTestId('customAppListCount')).toHaveTextContent(
      'one per line · 0 unique values (max 1000)'
    );
  });

  it('shows the values of the list it is bound to, one to a line', async () => {
    await render({}, ['matt', 'route']);

    expect(box()).toHaveValue('matt\nroute');
    expect(screen.getByTestId('customAppListCount')).toHaveTextContent('2 unique values');
  });

  it('counts the different values, so a repeat is not counted, and one value is "value"', async () => {
    await render();

    await write('matt\nmatt');

    expect(screen.getByTestId('customAppListCount')).toHaveTextContent('1 unique value (max');
  });

  it('sets the list when typing pauses, and not before', async () => {
    const { runtime } = await render();

    await write('matt\nroute');
    expect(runtime.state$.getValue().users).toEqual([]);

    act(() => {
      jest.advanceTimersByTime(LIST_INPUT_DEBOUNCE_MS);
    });

    expect(runtime.state$.getValue().users).toEqual(['matt', 'route']);
  });

  it('sets the list at once when the box is left', async () => {
    const { runtime } = await render();

    await write('matt');
    await userEvent.tab();

    expect(runtime.state$.getValue().users).toEqual(['matt']);
  });

  it('sets the list without the empty lines and the repeats', async () => {
    const { runtime } = await render();

    await write('matt\n\nroute\nmatt');
    await userEvent.tab();

    expect(runtime.state$.getValue().users).toEqual(['matt', 'route']);
  });

  it('follows the list when something else changes it', async () => {
    const { runtime } = await render();

    act(() => {
      runtime.run([{ type: 'setState', key: 'users', value: ['alice', 'bob'] }]);
    });

    expect(box()).toHaveValue('alice\nbob');
  });

  it('is emptied by Clear, which clears the list as well, at once', async () => {
    const { runtime } = await render({}, ['matt']);

    await userEvent.click(screen.getByTestId('customAppListClear'));

    expect(box()).toHaveValue('');
    expect(runtime.state$.getValue().users).toEqual([]);
  });

  it('has no Clear while the box is empty', async () => {
    await render();

    expect(screen.queryByTestId('customAppListClear')).not.toBeInTheDocument();
  });

  it('runs its own actions after setting the list, with the list as their input', async () => {
    const { runtime } = await render({
      onChange: [{ type: 'setState', key: 'other', value: { fromInput: true } }],
    });

    await write('matt');
    await userEvent.tab();

    expect(runtime.state$.getValue()).toEqual({ users: ['matt'], other: ['matt'] });
  });

  it('says that only the first values are used when there are too many, and uses them', async () => {
    const { runtime } = await render();
    const many = Array.from({ length: MAX_LIST_ITEMS + 5 }, (_, i) => `u${i}`).join('\n');

    // Typing a thousand lines is slow: the text is put in at once.
    await userEvent.click(box());
    await userEvent.paste(many);
    await userEvent.tab();

    expect(
      screen.getByText(`Only the first ${MAX_LIST_ITEMS} values are used.`)
    ).toBeInTheDocument();
    expect(runtime.state$.getValue().users).toHaveLength(MAX_LIST_ITEMS);
  });
});
