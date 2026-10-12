/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColumnsEditor, OptionsEditor, type ColumnConfig, type OptionConfig } from './list_editors';

/** Holds the value the way the editor does, and reports the latest to the test. */
const Stateful = <T,>({
  initial,
  onValue,
  children,
}: {
  initial: T;
  onValue: (value: T) => void;
  children: (value: T, set: (value: T) => void) => React.ReactNode;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      {children(value, (next) => {
        setValue(next);
        onValue(next);
      })}
    </>
  );
};

describe('OptionsEditor', () => {
  const setup = (initial: OptionConfig[]) => {
    const onValue = jest.fn();
    render(
      <Stateful initial={initial} onValue={onValue}>
        {(options, set) => <OptionsEditor options={options} onChange={set} />}
      </Stateful>
    );
    return onValue;
  };

  it('shows each option with its value and label', () => {
    setup([{ value: 'a', label: 'Alpha' }, { value: 'b' }]);

    expect(screen.getByLabelText('Value 1')).toHaveValue('a');
    expect(screen.getByLabelText('Label 1')).toHaveValue('Alpha');
    expect(screen.getByLabelText('Value 2')).toHaveValue('b');
    expect(screen.getByLabelText('Label 2')).toHaveValue('');
  });

  it('edits a value and a label, and drops an emptied label', async () => {
    const onValue = setup([{ value: 'a', label: 'A' }]);

    await userEvent.type(screen.getByLabelText('Value 1'), 'x');
    expect(onValue).toHaveBeenLastCalledWith([{ value: 'ax', label: 'A' }]);

    await userEvent.clear(screen.getByLabelText('Label 1'));
    expect(onValue).toHaveBeenLastCalledWith([{ value: 'ax', label: undefined }]);
  });

  it('adds an option with a fresh value, and removes one', async () => {
    const onValue = setup([{ value: 'a' }, { value: 'b' }]);

    await userEvent.click(screen.getByRole('button', { name: 'Add option' }));
    expect(onValue).toHaveBeenLastCalledWith([
      { value: 'a' },
      { value: 'b' },
      { value: 'option-3' },
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Remove option 1' }));
    expect(onValue).toHaveBeenLastCalledWith([{ value: 'b' }, { value: 'option-3' }]);
  });
});

describe('ColumnsEditor', () => {
  const setup = (initial: ColumnConfig[] | undefined) => {
    const onValue = jest.fn();
    render(
      <Stateful initial={initial} onValue={onValue}>
        {(columns, set) => <ColumnsEditor columns={columns} onChange={set} />}
      </Stateful>
    );
    return onValue;
  };

  it('says every column is shown until the author chooses columns', async () => {
    const onValue = setup(undefined);

    expect(screen.getByText('Every column of the query is shown.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: 'Choose which columns to show' }));
    expect(onValue).toHaveBeenLastCalledWith([{ field: '' }]);

    await userEvent.click(screen.getByRole('switch', { name: 'Choose which columns to show' }));
    expect(onValue).toHaveBeenLastCalledWith(undefined);
  });

  it('edits the name and the heading of a column', async () => {
    const onValue = setup([{ field: 'errors' }]);

    await userEvent.type(screen.getByLabelText('Heading 1'), 'Errors');

    expect(onValue).toHaveBeenLastCalledWith([{ field: 'errors', label: 'Errors' }]);
  });

  it('has no say in how a column is formatted, which follows from its type', () => {
    setup([{ field: 'errors' }]);

    expect(screen.queryByLabelText('Format 1')).not.toBeInTheDocument();
  });

  it('adds and removes columns', async () => {
    const onValue = setup([{ field: 'a' }]);

    await userEvent.click(screen.getByRole('button', { name: 'Add column' }));
    expect(onValue).toHaveBeenLastCalledWith([{ field: 'a' }, { field: '' }]);

    await userEvent.click(screen.getByRole('button', { name: 'Remove column 1' }));
    expect(onValue).toHaveBeenLastCalledWith([{ field: '' }]);
  });
});
