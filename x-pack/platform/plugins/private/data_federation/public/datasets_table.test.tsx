/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';

import type { DataSetWithName } from '../common';
import type { DataSetListRow, DatasetsTableProps } from './datasets_table';
import { DatasetsTable } from './datasets_table';
import { mainTranslations } from './main_i18n';

const createDataSetRow = ({
  name,
  dataSource,
}: {
  name: string;
  dataSource: string;
}): DataSetListRow =>
  ({
    name,
    data_source: dataSource,
    resource: 'bucket/*',
    description: '',
  } as DataSetWithName);

const renderTable = (overrides: Partial<DatasetsTableProps> = {}) =>
  render(
    <EuiProvider>
      <DatasetsTable
        filteredItems={[createDataSetRow({ name: 'set1', dataSource: 'ds1' })]}
        selectedItems={[]}
        dataSourceNames={['ds1']}
        dataSourceFilter={[]}
        onSelectionChange={jest.fn()}
        onDataSourceFilterChange={jest.fn()}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onClone={jest.fn()}
        onOpenInDiscover={jest.fn()}
        onDelete={jest.fn()}
        onDeleteSelected={jest.fn()}
        {...overrides}
      />
    </EuiProvider>
  );

describe('DatasetsTable', () => {
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const [first] = args;
    if (typeof first === 'string' && first.includes('Detected not recommended unit')) {
      return;
    }
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  it('calls onCreate with the selected flow when a menu item is chosen', async () => {
    const onCreate = jest.fn();

    const { getByTestId } = renderTable({ onCreate });

    fireEvent.click(getByTestId('dataSetsSetsCreateButton'));
    fireEvent.click(getByTestId('dataSetsSetsCreateFlow2Button'));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith('flow_2');

    fireEvent.click(getByTestId('dataSetsSetsCreateButton'));
    fireEvent.click(getByTestId('dataSetsSetsCreateFlow3Button'));

    expect(onCreate).toHaveBeenCalledTimes(2);
    expect(onCreate).toHaveBeenLastCalledWith('flow_3');
  });

  it('renders the data source filter button', () => {
    const { getByTestId } = renderTable({
      dataSourceNames: ['ds1', 'ds2'],
      dataSourceFilter: ['ds1'],
    });

    expect(getByTestId('dataSetsSetsDataSourceFilter')).toBeInTheDocument();
  });

  it('calls onEdit and onDelete for row actions', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    const { getByTestId } = renderTable({
      filteredItems: [createDataSetRow({ name: 'set1', dataSource: 'ds1' })],
      onEdit,
      onDelete,
    });

    fireEvent.click(getByTestId('euiCollapsedItemActionsButton'));
    fireEvent.click(getByTestId('dataSetsSetsEditButton'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ name: 'set1' }));

    fireEvent.click(getByTestId('euiCollapsedItemActionsButton'));
    fireEvent.click(getByTestId('dataSetsSetsDeleteIconButton'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ name: 'set1' }));
  });

  it('shows bulk delete when selection is non-empty and calls onDeleteSelected', async () => {
    const onDeleteSelected = jest.fn();
    const selectedItems = [createDataSetRow({ name: 'set1', dataSource: 'ds1' })];

    const { getByTestId } = renderTable({
      filteredItems: [...selectedItems, createDataSetRow({ name: 'set2', dataSource: 'ds1' })],
      selectedItems,
      onDeleteSelected,
    });

    fireEvent.click(getByTestId('dataSetsSetsDeleteButton'));
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
    expect(onDeleteSelected).toHaveBeenCalledWith(selectedItems);
  });

  it('calls onClone from the collapsed row actions menu', () => {
    const onClone = jest.fn();

    const { getByTestId } = renderTable({
      filteredItems: [createDataSetRow({ name: 'set1', dataSource: 'ds1' })],
      onClone,
    });

    fireEvent.click(getByTestId('euiCollapsedItemActionsButton'));
    fireEvent.click(getByTestId('dataSetsSetsCloneButton'));
    expect(onClone).toHaveBeenCalledTimes(1);
    expect(onClone).toHaveBeenCalledWith(expect.objectContaining({ name: 'set1' }));
  });

  it('calls onOpenInDiscover from the visible row action', () => {
    const onOpenInDiscover = jest.fn();

    const { getByTestId } = renderTable({
      filteredItems: [createDataSetRow({ name: 'set1', dataSource: 'ds1' })],
      onOpenInDiscover,
      isOpenInDiscoverEnabled: true,
    });

    fireEvent.click(getByTestId('dataSetsSetsOpenInDiscoverButton'));
    expect(onOpenInDiscover).toHaveBeenCalledTimes(1);
    expect(onOpenInDiscover).toHaveBeenCalledWith(expect.objectContaining({ name: 'set1' }));
  });

  it('renders an enabled toggle to the left of actions and updates it when clicked', () => {
    const onOpenInDiscover = jest.fn();
    const { getByRole, getByTestId } = renderTable({
      filteredItems: [createDataSetRow({ name: 'set1', dataSource: 'ds1' })],
      isOpenInDiscoverEnabled: true,
      onOpenInDiscover,
    });

    expect(getByRole('columnheader', { name: 'Enabled' })).toBeInTheDocument();

    const enabledSwitch = getByTestId('dataSetsSetsEnabledSwitch-set1');
    expect(enabledSwitch).toBeChecked();
    expect(getByTestId('dataSetsSetsOpenInDiscoverButton')).toBeEnabled();

    fireEvent.click(enabledSwitch);
    expect(enabledSwitch).not.toBeChecked();
    expect(enabledSwitch.closest('tr')).toHaveClass('dataFederationTableRow--disabled');

    const disabledDiscoverButton = getByTestId('dataSetsSetsOpenInDiscoverButton');
    expect(disabledDiscoverButton).toBeDisabled();
    fireEvent.click(disabledDiscoverButton);
    expect(onOpenInDiscover).not.toHaveBeenCalled();

    fireEvent.click(enabledSwitch);
    expect(enabledSwitch).toBeChecked();
    expect(enabledSwitch.closest('tr')).not.toHaveClass('dataFederationTableRow--disabled');
    expect(getByTestId('dataSetsSetsOpenInDiscoverButton')).toBeEnabled();
  });

  it('disables the enabled toggle when the data source is disabled', () => {
    const { getAllByTestId, getByTestId } = renderTable({
      filteredItems: [
        createDataSetRow({ name: 'set1', dataSource: 'ds1' }),
        createDataSetRow({ name: 'set2', dataSource: 'ds2' }),
      ],
      dataSourceNames: ['ds1', 'ds2'],
      disabledDataSourceNames: new Set(['ds1']),
      isOpenInDiscoverEnabled: true,
    });

    const disabledSwitch = getByTestId('dataSetsSetsEnabledSwitch-set1');
    expect(disabledSwitch).toBeDisabled();
    expect(disabledSwitch).not.toBeChecked();
    expect(disabledSwitch.closest('tr')).toHaveClass('dataFederationTableRow--disabled');

    fireEvent.click(disabledSwitch);
    expect(disabledSwitch).not.toBeChecked();

    fireEvent.mouseOver(disabledSwitch.parentElement as Node);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      mainTranslations.columns.dataSets.enabledToggleDisabledBecauseDataSource
    );

    const enabledSwitch = getByTestId('dataSetsSetsEnabledSwitch-set2');
    expect(enabledSwitch).toBeEnabled();
    expect(enabledSwitch).toBeChecked();
    expect(enabledSwitch.closest('tr')).not.toHaveClass('dataFederationTableRow--disabled');

    const discoverButtons = getAllByTestId('dataSetsSetsOpenInDiscoverButton');
    expect(discoverButtons[0]).toBeDisabled();
    expect(discoverButtons[1]).toBeEnabled();
  });

  it('disables Open in Discover when the locator is unavailable', () => {
    const onOpenInDiscover = jest.fn();

    const { getByTestId } = renderTable({
      onOpenInDiscover,
      isOpenInDiscoverEnabled: false,
    });

    const discoverButton = getByTestId('dataSetsSetsOpenInDiscoverButton');
    expect(discoverButton).toBeDisabled();

    fireEvent.click(discoverButton);
    expect(onOpenInDiscover).not.toHaveBeenCalled();
  });
});
