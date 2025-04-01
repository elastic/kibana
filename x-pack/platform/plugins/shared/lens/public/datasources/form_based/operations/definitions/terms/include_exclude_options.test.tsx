/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncludeExcludeRow, IncludeExcludeRowProps } from './include_exclude_options';

const tableRows = [
  {
    '1': 'ABC',
    '2': 'test',
  },
  {
    '1': 'FEF',
    '2': 'test',
  },
];
const onUpdateSpy = jest.fn();

describe('IncludeExcludeComponent', () => {
  const renderIncludeExcludeRow = (propsOverrides?: Partial<IncludeExcludeRowProps>) => {
    const rtlRender = render(
      <IncludeExcludeRow
        include={[]}
        exclude={[]}
        updateParams={onUpdateSpy}
        columnId="1"
        isNumberField={false}
        includeIsRegex={false}
        excludeIsRegex={false}
        {...propsOverrides}
      />
    );
    return rtlRender;
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render 2 EuiComboBox component correctly', () => {
    renderIncludeExcludeRow();
    expect(screen.getAllByRole('combobox').length).toEqual(2);
  });

  it('should run updateParams function on update', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      tableRows,
    });
    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    fireEvent.click(screen.getByRole('option', { name: 'ABC' }));
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('ABC');
    expect(onUpdateSpy).toHaveBeenCalledTimes(1);
  });

  it('should run updateParams function onCreateOption', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      tableRows,
    });
    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Include values' }), 'test.*{Enter}');
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('test.*');
    expect(onUpdateSpy).toHaveBeenCalledTimes(1);
  });

  it('should initialize the selected options correctly if include prop is given', () => {
    renderIncludeExcludeRow({
      include: ['FEF'],
      exclude: undefined,
      tableRows,
    });
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('FEF');
  });

  it('should initialize the selected options correctly if exclude prop is given', () => {
    renderIncludeExcludeRow({
      include: ['FEF'],
      exclude: ['ABC'],
      tableRows,
    });
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('FEF');
    expect(screen.getByTestId('lens-exclude-terms-combobox')).toHaveTextContent('ABC');
  });

  it('should initialize the options correctly', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      tableRows,
    });
    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'ABC',
      'FEF',
    ]);
  });

  it('should display an input text if pattern is selected', () => {
    renderIncludeExcludeRow({
      include: ['test.*'],
      exclude: undefined,
      includeIsRegex: true,
      tableRows,
    });
    expect(
      screen.getByRole('textbox', { name: 'Enter a regex to filter values' })
    ).toBeInTheDocument();
  });

  it('should run updateParams on the input text if pattern is selected', async () => {
    renderIncludeExcludeRow({
      include: ['test.*'],
      exclude: undefined,
      includeIsRegex: false,
      tableRows,
    });
    await userEvent.click(screen.getByTestId('lens-include-terms-regex-switch'));
    expect(onUpdateSpy).toHaveBeenCalledWith('include', [], 'includeIsRegex', true);
  });

  it('should run as multi selection if normal string is given', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      isNumberField: false,
      tableRows,
    });
    const typedValues = ['test.*', 'ABC'];
    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Include values' }),
      `${typedValues[0]}{Enter}`
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Include values' }),
      `${typedValues[1]}{Enter}`
    );

    within(screen.getByTestId('lens-include-terms-combobox'))
      .getAllByTestId('euiComboBoxPill')
      .map((pill, i) => {
        expect(pill).toHaveTextContent(typedValues[i]);
      });
    expect(onUpdateSpy).toHaveBeenCalledTimes(2);
  });

  it('should prevent identical include and exclude values on change when making single selections', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      isNumberField: false,
      tableRows,
    });

    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.click(screen.getByRole('option', { name: 'ABC' }));
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('ABC');

    await userEvent.click(screen.getByRole('combobox', { name: 'Exclude values' }));
    await userEvent.click(screen.getByRole('option', { name: 'ABC' }));
    expect(screen.getByTestId('lens-exclude-terms-combobox')).toHaveTextContent('ABC');

    expect(screen.getByTestId('lens-include-terms-combobox')).not.toHaveTextContent('ABC');

    expect(onUpdateSpy).toHaveBeenCalledTimes(3);
  });

  it('should prevent identical include and exclude values on change when making multiple selections', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      isNumberField: false,
      tableRows,
    });

    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.click(screen.getByRole('option', { name: 'ABC' }));
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('ABC');

    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.click(screen.getByRole('option', { name: 'FEF' }));
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('FEF');

    await userEvent.click(screen.getByRole('combobox', { name: 'Exclude values' }));
    await userEvent.click(screen.getByRole('option', { name: 'ABC' }));
    expect(screen.getByTestId('lens-include-terms-combobox')).not.toHaveTextContent('ABC');

    expect(screen.getByTestId('lens-exclude-terms-combobox')).toHaveTextContent('ABC');

    expect(onUpdateSpy).toHaveBeenCalledTimes(4);
  });

  it('should prevent identical include and exclude values on create option', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      isNumberField: false,
      tableRows,
    });

    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Include values' }), 'test{enter}');
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('test');

    await userEvent.click(screen.getByRole('combobox', { name: 'Exclude values' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Exclude values' }), 'test{enter}');
    expect(screen.getByTestId('lens-exclude-terms-combobox')).toHaveTextContent('test');

    expect(screen.getByTestId('lens-include-terms-combobox')).not.toHaveTextContent('test');

    expect(onUpdateSpy).toHaveBeenCalledTimes(3);
  });

  it('should prevent identical include and exclude values when creating multiple options', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      isNumberField: false,
      tableRows,
    });

    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Include values' }), 'test{enter}');
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('test');

    await userEvent.type(screen.getByRole('combobox', { name: 'Include values' }), 'test1{enter}');
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('test1');

    await userEvent.click(screen.getByRole('combobox', { name: 'Exclude values' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Exclude values' }), 'test1{enter}');
    expect(screen.getByTestId('lens-exclude-terms-combobox')).toHaveTextContent('test1');

    expect(screen.getByTestId('lens-include-terms-combobox')).not.toHaveTextContent('test1');

    expect(onUpdateSpy).toHaveBeenCalledTimes(4);
  });

  it('should prevent identical include value on exclude regex value change', async () => {
    jest.useFakeTimers();

    renderIncludeExcludeRow({
      include: [''],
      exclude: [''],
      includeIsRegex: true,
      excludeIsRegex: true,
      tableRows,
    });

    const includeRegexInput = screen.getByTestId('lens-include-terms-regex-input');
    const excludeRegexInput = screen.getByTestId('lens-exclude-terms-regex-input');
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.type(includeRegexInput, 'test.*');
    act(() => {
      jest.advanceTimersByTime(256);
    });
    expect(includeRegexInput).toHaveValue('test.*');
    expect(onUpdateSpy).toHaveBeenCalledWith('include', ['test.*'], 'includeIsRegex', true);

    await user.type(excludeRegexInput, 'test.*');
    act(() => {
      jest.advanceTimersByTime(256);
    });
    expect(excludeRegexInput).toHaveValue('test.*');
    expect(onUpdateSpy).toHaveBeenCalledWith('exclude', ['test.*'], 'excludeIsRegex', true);

    expect(includeRegexInput).toHaveValue('');
    expect(onUpdateSpy).toHaveBeenCalledWith('include', [''], 'includeIsRegex', true);

    expect(onUpdateSpy).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
  });

  it('should prevent identical exclude value on include regex value change', async () => {
    jest.useFakeTimers();

    renderIncludeExcludeRow({
      include: [''],
      exclude: [''],
      includeIsRegex: true,
      excludeIsRegex: true,
      tableRows,
    });

    const includeRegexInput = screen.getByTestId('lens-include-terms-regex-input');
    const excludeRegexInput = screen.getByTestId('lens-exclude-terms-regex-input');
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.type(excludeRegexInput, 'test.*');
    act(() => {
      jest.advanceTimersByTime(256);
    });
    expect(excludeRegexInput).toHaveValue('test.*');
    expect(onUpdateSpy).toHaveBeenCalledWith('exclude', ['test.*'], 'excludeIsRegex', true);

    await user.type(includeRegexInput, 'test.*');
    act(() => {
      jest.advanceTimersByTime(256);
    });
    expect(includeRegexInput).toHaveValue('test.*');
    expect(onUpdateSpy).toHaveBeenCalledWith('include', ['test.*'], 'includeIsRegex', true);

    expect(excludeRegexInput).toHaveValue('');
    expect(onUpdateSpy).toHaveBeenCalledWith('exclude', [''], 'excludeIsRegex', true);

    expect(onUpdateSpy).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });
});
