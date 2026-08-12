/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MultiSelectFilter } from './multi_select_filter';

const FILTER_TEST_SUBJ = 'testMultiSelectFilter';

const OPTIONS = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
] as const;

type TestValue = (typeof OPTIONS)[number]['value'];

const renderWithProviders = (
  props: Partial<React.ComponentProps<typeof MultiSelectFilter<TestValue>>> = {}
) => {
  const onChange = props.onChange ?? jest.fn();

  render(
    <I18nProvider>
      <EuiProvider>
        <MultiSelectFilter<TestValue>
          data-test-subj={FILTER_TEST_SUBJ}
          label="Test filter"
          options={OPTIONS}
          selected={props.selected ?? []}
          onChange={onChange}
          {...props}
        />
      </EuiProvider>
    </I18nProvider>
  );

  return { onChange };
};

const openFilterPopover = () => {
  fireEvent.click(screen.getByTestId(FILTER_TEST_SUBJ));
};

describe('MultiSelectFilter', () => {
  it('renders the label on the filter button', () => {
    renderWithProviders();

    expect(screen.getByTestId(FILTER_TEST_SUBJ)).toHaveTextContent('Test filter');
  });

  it('popover content is not rendered until the button is clicked, and options appear after clicking', async () => {
    renderWithProviders();

    expect(screen.queryByTestId(`${FILTER_TEST_SUBJ}Option-alpha`)).not.toBeInTheDocument();

    openFilterPopover();

    expect(await screen.findByTestId(`${FILTER_TEST_SUBJ}Option-alpha`)).toBeInTheDocument();
  });

  it("clicking an unselected option calls onChange with an array containing that option's value", async () => {
    const { onChange } = renderWithProviders();

    openFilterPopover();
    fireEvent.click(await screen.findByTestId(`${FILTER_TEST_SUBJ}Option-beta`));

    expect(onChange).toHaveBeenCalledWith(['beta']);
  });

  it('with two options already selected, clicking one of them calls onChange with only the remaining value', async () => {
    const { onChange } = renderWithProviders({ selected: ['alpha', 'beta'] });

    openFilterPopover();
    fireEvent.click(await screen.findByTestId(`${FILTER_TEST_SUBJ}Option-alpha`));

    expect(onChange).toHaveBeenCalledWith(['beta']);
  });

  it('deselecting the last selected option calls onChange with an empty array', async () => {
    const { onChange } = renderWithProviders({ selected: ['gamma'] });

    openFilterPopover();
    fireEvent.click(await screen.findByTestId(`${FILTER_TEST_SUBJ}Option-gamma`));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('reflects the active filter count when selected is non-empty', () => {
    renderWithProviders({ selected: ['alpha', 'beta'] });

    const filterButton = screen.getByTestId(FILTER_TEST_SUBJ);

    expect(filterButton).toHaveClass('euiFilterButton-hasActiveFilters');
    expect(filterButton).toHaveTextContent('2');
  });

  it('does not mark the filter button as active when selected is empty', () => {
    renderWithProviders({ selected: [] });

    const filterButton = screen.getByTestId(FILTER_TEST_SUBJ);

    expect(filterButton).not.toHaveClass('euiFilterButton-hasActiveFilters');
    expect(filterButton).toHaveTextContent(String(OPTIONS.length));
  });

  it('renders every provided option with its test subject and label text', async () => {
    renderWithProviders();

    openFilterPopover();

    for (const option of OPTIONS) {
      const optionElement = await screen.findByTestId(`${FILTER_TEST_SUBJ}Option-${option.value}`);
      expect(optionElement).toBeInTheDocument();
      expect(optionElement).toHaveTextContent(option.label);
    }
  });
});
