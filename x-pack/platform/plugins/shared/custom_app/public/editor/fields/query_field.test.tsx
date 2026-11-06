/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StateDeclaration } from '@kbn/custom-app-common';
import { QueryField } from './query_field';

jest.mock('@kbn/esql/public', () => jest.requireActual('./esql_editor.mock'));

const STATE: Record<string, StateDeclaration> = {
  service: { type: 'string', default: 'checkout' },
  limit: { type: 'number', default: 5 },
};

const setup = (initial: string, state = STATE) => {
  const onValue = jest.fn();
  const Host = () => {
    const [query, setQuery] = useState(initial);
    return (
      <QueryField
        query={query}
        state={state}
        onChange={(next) => {
          setQuery(next);
          onValue(next);
        }}
      />
    );
  };
  render(<Host />);
  return onValue;
};

describe('QueryField', () => {
  it('shows the query in the ES|QL editor, and passes edits on', async () => {
    const onValue = setup('FROM logs');
    const editor = screen.getByLabelText('ES|QL query editor');
    expect(editor).toHaveValue('FROM logs');

    await userEvent.type(editor, ' | LIMIT 5');

    expect(onValue).toHaveBeenLastCalledWith('FROM logs | LIMIT 5');
  });

  it('shows no parameters for a query that uses none', () => {
    setup('FROM logs | LIMIT 10');

    expect(screen.queryByText('Uses:')).not.toBeInTheDocument();
  });

  it('shows the values a query uses, as the app declares them', () => {
    setup('FROM logs | WHERE service == ?service | LIMIT ?limit');

    expect(screen.getByText('Uses:')).toBeInTheDocument();
    expect(screen.getByText('service')).toBeInTheDocument();
    expect(screen.getByText('limit')).toBeInTheDocument();
    expect(screen.queryByText(/not a value of this app/)).not.toBeInTheDocument();
  });

  it('says when a query uses something the app does not have', async () => {
    setup('FROM logs');

    await userEvent.type(
      screen.getByLabelText('ES|QL query editor'),
      ' | WHERE env == ?env AND host == ?host'
    );

    expect(await screen.findByText(/env, host are not a value of this app/)).toBeInTheDocument();
  });

  it('says the same, in the singular, for one', () => {
    setup('FROM logs | WHERE env == ?env');

    expect(
      screen.getByText(/env is not a value of this app\. It works only if/)
    ).toBeInTheDocument();
  });

  it('lists a name once however often the query uses it', () => {
    setup('FROM logs | WHERE a == ?service OR b == ?service');

    expect(screen.getAllByText('service')).toHaveLength(1);
  });
});
