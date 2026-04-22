/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { IndexSelectPopover } from './index_select_popover';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

// EuiComboBox uses FixedSizeList from react-window for virtualized rendering.
// In jsdom the container has zero height so FixedSizeList renders no items.
// Mock it to render all items directly so options appear in the DOM.
jest.mock('react-window', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FixedSizeList: ({ children, itemCount, itemData }: any) => (
    <div>
      {Array.from({ length: itemCount }, (_, index) =>
        children({ index, style: {}, data: itemData })
      )}
    </div>
  ),
}));

jest.mock('lodash', () => {
  const module = jest.requireActual('lodash');
  return {
    ...module,
    debounce: (fn: () => unknown) => fn,
  };
});

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => {
  const original = jest.requireActual('@kbn/triggers-actions-ui-plugin/public');
  return {
    ...original,
    getIndexPatterns: () => {
      return ['index1', 'index2'];
    },
    getTimeFieldOptions: () => {
      return [
        {
          text: '@timestamp',
          value: '@timestamp',
        },
      ];
    },
    getIndexOptions: () => {
      return Promise.resolve([
        {
          label: 'indexOption',
          options: [
            {
              label: 'index1',
              value: 'index1',
            },
            {
              label: 'index2',
              value: 'index2',
            },
          ],
        },
      ]);
    },
  };
});

const dataViewsMock =
  dataViewPluginMocks.createStartContract() as jest.Mocked<DataViewsPublicPluginStart>;

const setupDataViewsMock = () => {
  dataViewsMock.getFieldsForWildcard = jest.fn().mockResolvedValue([
    {
      name: '@timestamp',
      type: 'date',
      esTypes: ['date'],
      searchable: true,
      aggregatable: true,
      isMapped: true,
    },
    {
      name: 'field',
      type: 'string',
      esTypes: ['text'],
      searchable: true,
      aggregatable: false,
      isMapped: true,
    },
  ]);
};

describe('IndexSelectPopover', () => {
  const onIndexChange = jest.fn();
  const onTimeFieldChange = jest.fn();
  const props = {
    index: [],
    esFields: [],
    timeField: undefined,
    errors: {
      index: [],
      timeField: [],
    },
    dataViews: dataViewsMock,
    onIndexChange,
    onTimeFieldChange,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    setupDataViewsMock();
  });

  test('renders closed popover initially and opens on click', async () => {
    renderWithI18n(<IndexSelectPopover {...props} />);

    const selectIndexExpression = screen.getByTestId('selectIndexExpression');
    expect(selectIndexExpression).toBeInTheDocument();
    expect(screen.queryByTestId('thresholdIndexesComboBox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('thresholdAlertTimeFieldSelect')).not.toBeInTheDocument();

    await userEvent.click(selectIndexExpression);

    await screen.findByTestId('thresholdIndexesComboBox');
    expect(screen.getByTestId('thresholdAlertTimeFieldSelect')).toBeInTheDocument();
  });

  test('renders search input', async () => {
    renderWithI18n(<IndexSelectPopover {...props} />);

    const selectIndexExpression = screen.getByTestId('selectIndexExpression');
    expect(selectIndexExpression).toBeInTheDocument();
    await userEvent.click(selectIndexExpression);

    await screen.findByTestId('thresholdIndexesComboBox');

    const searchInput = screen.getByTestId('comboBoxSearchInput') as HTMLInputElement;
    expect(searchInput).toHaveValue('');

    await userEvent.type(searchInput, 'indexPattern1');
    expect(searchInput).toHaveValue('indexPattern1');

    // Options should be loaded - click first available option in the combobox options list
    // (scoped to avoid matching <select><option> elements from the time field selector)
    const optionsList = await screen.findByTestId(/comboBoxOptionsList/);
    const comboOptions = within(optionsList).getAllByRole('option');
    expect(comboOptions.length).toBeGreaterThan(0);
    await userEvent.click(comboOptions[0]);

    await waitFor(() => {
      expect(onIndexChange).toHaveBeenCalledWith(['index1']);
    });

    await userEvent.selectOptions(
      screen.getByTestId('thresholdAlertTimeFieldSelect'),
      '@timestamp'
    );
    expect(onTimeFieldChange).toHaveBeenCalledWith('@timestamp');
  });

  test('renders index and timeField if defined', async () => {
    const index = 'test-index';
    const timeField = '@timestamp';
    const indexSelectProps = {
      ...props,
      index: [index],
      timeField,
    };
    renderWithI18n(<IndexSelectPopover {...indexSelectProps} />);
    const selectIndexExpression = screen.getByTestId('selectIndexExpression');
    expect(selectIndexExpression).toHaveTextContent(`index ${index}`);

    await userEvent.click(selectIndexExpression);

    await screen.findByTestId('thresholdAlertTimeFieldSelect');

    const select = screen.getByTestId('thresholdAlertTimeFieldSelect') as HTMLSelectElement;
    const optionsText = Array.from(select.options)
      .map((o) => o.text)
      .join('');
    expect(optionsText).toContain(timeField);
  });
});
