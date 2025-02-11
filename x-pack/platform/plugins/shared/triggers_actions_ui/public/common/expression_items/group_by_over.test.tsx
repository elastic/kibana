/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { GroupByExpression } from './group_by_over';
import { render, screen, fireEvent, configure } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

describe('group by expression', () => {
  configure({ testIdAttribute: 'data-test-subj' });
  it('renders with builtin group by types', async () => {
    const onChangeSelectedTermField = jest.fn();
    const onChangeSelectedGroupBy = jest.fn();
    const onChangeSelectedTermSize = jest.fn();
    render(
      <IntlProvider locale="en">
        <GroupByExpression
          errors={{ termSize: [], termField: [] }}
          fields={[]}
          groupBy={'all'}
          onChangeSelectedGroupBy={onChangeSelectedGroupBy}
          onChangeSelectedTermField={onChangeSelectedTermField}
          onChangeSelectedTermSize={onChangeSelectedTermSize}
        />
      </IntlProvider>
    );
    fireEvent.click(screen.getByTestId('groupByExpression'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    expect(screen.getByRole('option', { name: 'all documents' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'top' })).toBeInTheDocument();
  });

  it('clears selected agg field if fields does not contain current selection', async () => {
    const onChangeSelectedTermField = jest.fn();
    render(
      <IntlProvider locale="en">
        <GroupByExpression
          errors={{ termSize: [], termField: [] }}
          fields={[
            {
              normalizedType: 'number',
              name: 'test',
              type: 'long',
              searchable: true,
              aggregatable: true,
            },
          ]}
          termField="notavailable"
          groupBy={'top'}
          onChangeSelectedGroupBy={() => {}}
          onChangeSelectedTermSize={() => {}}
          onChangeSelectedTermField={onChangeSelectedTermField}
        />
      </IntlProvider>
    );
    expect(onChangeSelectedTermField).toHaveBeenCalledTimes(1);
    expect(onChangeSelectedTermField).toHaveBeenCalledWith(undefined);
  });

  it('clears selected agg field if there is unknown field', async () => {
    const onChangeSelectedTermField = jest.fn();
    render(
      <IntlProvider locale="en">
        <GroupByExpression
          errors={{ termSize: [], termField: [] }}
          fields={[
            {
              normalizedType: 'number',
              name: 'test',
              type: 'long',
              searchable: true,
              aggregatable: true,
            },
          ]}
          termField={['test', 'unknown']}
          groupBy={'top'}
          onChangeSelectedGroupBy={() => {}}
          onChangeSelectedTermSize={() => {}}
          onChangeSelectedTermField={onChangeSelectedTermField}
        />
      </IntlProvider>
    );
    expect(onChangeSelectedTermField).toHaveBeenCalledTimes(1);
    expect(onChangeSelectedTermField).toHaveBeenCalledWith(undefined);
  });

  it('clears selected agg field if groupBy field is all', async () => {
    const onChangeSelectedTermField = jest.fn();
    render(
      <IntlProvider locale="en">
        <GroupByExpression
          errors={{ termSize: [], termField: [] }}
          fields={[
            {
              normalizedType: 'number',
              name: 'test',
              type: 'long',
              searchable: true,
              aggregatable: true,
            },
          ]}
          termField={['test']}
          groupBy={'all'}
          onChangeSelectedGroupBy={() => {}}
          onChangeSelectedTermSize={() => {}}
          onChangeSelectedTermField={onChangeSelectedTermField}
        />
      </IntlProvider>
    );

    expect(onChangeSelectedTermField).toHaveBeenCalledTimes(1);
    expect(onChangeSelectedTermField).toHaveBeenCalledWith(undefined);
  });

  it('calls onChangeSelectedTermField when a termField is selected', async () => {
    const onChangeSelectedTermField = jest.fn();
    render(
      <IntlProvider locale="en">
        <GroupByExpression
          errors={{ termSize: [], termField: [] }}
          fields={[
            {
              normalizedType: 'number',
              name: 'field1',
              type: 'long',
              searchable: true,
              aggregatable: true,
            },
            {
              normalizedType: 'number',
              name: 'field2',
              type: 'long',
              searchable: true,
              aggregatable: true,
            },
          ]}
          termSize={1}
          groupBy={'top'}
          onChangeSelectedGroupBy={() => {}}
          onChangeSelectedTermSize={() => {}}
          onChangeSelectedTermField={onChangeSelectedTermField}
        />
      </IntlProvider>
    );

    expect(onChangeSelectedTermField).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('groupByExpression'));

    expect(await screen.findByText(/You are in a dialog/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));

    const option1 = screen.getByText('field1');
    expect(option1).toBeInTheDocument();
    fireEvent.click(option1);
    expect(onChangeSelectedTermField).toHaveBeenCalledWith('field1');

    const option2 = screen.getByText('field2');
    expect(option2).toBeInTheDocument();
    fireEvent.click(option2);
    expect(onChangeSelectedTermField).toHaveBeenCalledWith('field2');
  });

  it('calls onChangeSelectedTermField when multiple termFields are selected', async () => {
    const onChangeSelectedTermField = jest.fn();
    render(
      <IntlProvider locale="en">
        <GroupByExpression
          errors={{ termSize: [], termField: [] }}
          fields={[
            {
              normalizedType: 'number',
              name: 'field1',
              type: 'long',
              searchable: true,
              aggregatable: true,
            },
            {
              normalizedType: 'number',
              name: 'field2',
              type: 'long',
              searchable: true,
              aggregatable: true,
            },
          ]}
          termSize={1}
          groupBy="top"
          onChangeSelectedGroupBy={() => {}}
          onChangeSelectedTermSize={() => {}}
          onChangeSelectedTermField={onChangeSelectedTermField}
          canSelectMultiTerms={true}
        />
      </IntlProvider>
    );
    expect(onChangeSelectedTermField).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('groupByExpression'));

    expect(await screen.findByText(/You are in a dialog/)).toBeInTheDocument();

    // dropdown is closed
    expect(screen.queryByText('field1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));

    // dropdown is open
    expect(screen.getByText('field1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('field1'));
    expect(onChangeSelectedTermField).toHaveBeenCalledWith('field1');

    fireEvent.click(screen.getByText('field2'));
    expect(onChangeSelectedTermField).toHaveBeenCalledTimes(2);
    expect(onChangeSelectedTermField).toHaveBeenCalledWith(['field1', 'field2']);
  });

  it('do NOT clear selected agg field if fields is undefined', async () => {
    const onChangeSelectedTermField = jest.fn();
    render(
      <IntlProvider locale="en">
        <GroupByExpression
          errors={{ termSize: [], termField: [] }}
          fields={undefined}
          termField={['test', 'unknown']}
          groupBy={'top'}
          onChangeSelectedGroupBy={() => {}}
          onChangeSelectedTermSize={() => {}}
          onChangeSelectedTermField={onChangeSelectedTermField}
        />
      </IntlProvider>
    );
    expect(onChangeSelectedTermField).toHaveBeenCalledTimes(0);
  });

  it('do NOT clear selected agg field if fields is an empty array', async () => {
    const onChangeSelectedTermField = jest.fn();
    render(
      <IntlProvider locale="en">
        <GroupByExpression
          errors={{ termSize: [], termField: [] }}
          fields={[]}
          termField={['test', 'unknown']}
          groupBy={'top'}
          onChangeSelectedGroupBy={() => {}}
          onChangeSelectedTermSize={() => {}}
          onChangeSelectedTermField={onChangeSelectedTermField}
        />
      </IntlProvider>
    );
    expect(onChangeSelectedTermField).toHaveBeenCalledTimes(0);
  });
});
