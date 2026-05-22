/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RetentionOption } from './types';
import { RetentionSelector } from './retention_selector';

describe('RetentionSelector', () => {
  const rowTestSubj = (name: string) =>
    `retentionSelectableRow-${name.replace(/[^a-zA-Z0-9]+/g, '_')}`;
  const inspectTestSubj = (name: string) =>
    `retentionSelectableRowInspect-${name.replace(/[^a-zA-Z0-9]+/g, '_')}`;

  const renderWithTheme = (node: React.ReactElement) =>
    render(node, {
      wrapper: EuiThemeProvider,
    });

  const options: RetentionOption[] = [
    {
      name: 'Policy A',
      descriptionParts: ['hot', '7d'],
      inspectable: true,
    },
    {
      name: 'Policy B',
      descriptionParts: ['warm', '30d'],
      inspectable: false,
    },
  ];

  it('filters options by search value', async () => {
    const user = userEvent.setup();
    const onSelectOption = jest.fn();
    const onInspect = jest.fn();

    renderWithTheme(
      <RetentionSelector
        options={options}
        onSelectOption={onSelectOption}
        onInspect={onInspect}
        searchPlaceholder="Search policies"
        inspectButtonLabel={(name) => `Inspect ${name}`}
      />
    );

    expect(screen.getByTestId(rowTestSubj('Policy A'))).toBeInTheDocument();
    expect(screen.getByTestId(rowTestSubj('Policy B'))).toBeInTheDocument();

    await user.type(screen.getByTestId('retentionSelectorSearchInput'), 'b');

    expect(screen.queryByTestId(rowTestSubj('Policy A'))).not.toBeInTheDocument();
    expect(screen.getByTestId(rowTestSubj('Policy B'))).toBeInTheDocument();
  });

  it('calls onSelectOption when a row is clicked', async () => {
    const user = userEvent.setup();
    const onSelectOption = jest.fn();
    const onInspect = jest.fn();

    renderWithTheme(
      <RetentionSelector
        options={options}
        onSelectOption={onSelectOption}
        onInspect={onInspect}
        searchPlaceholder="Search policies"
        inspectButtonLabel={(name) => `Inspect ${name}`}
      />
    );

    await user.click(screen.getByTestId(rowTestSubj('Policy B')));
    expect(onSelectOption).toHaveBeenCalledTimes(1);
    expect(onSelectOption).toHaveBeenCalledWith('Policy B');
  });

  it('calls onInspect without selecting the row', async () => {
    const user = userEvent.setup();
    const onSelectOption = jest.fn();
    const onInspect = jest.fn();

    renderWithTheme(
      <RetentionSelector
        options={options}
        onSelectOption={onSelectOption}
        onInspect={onInspect}
        searchPlaceholder="Search policies"
        inspectButtonLabel={(name) => `Inspect ${name}`}
      />
    );

    await user.click(screen.getByTestId(inspectTestSubj('Policy A')));
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onInspect).toHaveBeenCalledWith('Policy A');
    expect(onSelectOption).not.toHaveBeenCalled();
  });

  it('disables search, selection, and inspect actions when isDisabled is true', async () => {
    const user = userEvent.setup();
    const onSelectOption = jest.fn();
    const onInspect = jest.fn();

    renderWithTheme(
      <RetentionSelector
        options={options}
        onSelectOption={onSelectOption}
        onInspect={onInspect}
        isDisabled
        searchPlaceholder="Search policies"
        inspectButtonLabel={(name) => `Inspect ${name}`}
      />
    );

    expect(screen.getByTestId('retentionSelectorSearchInput')).toBeDisabled();
    expect(screen.getByTestId(inspectTestSubj('Policy A'))).toBeDisabled();

    await user.click(screen.getByTestId(rowTestSubj('Policy A')));
    expect(onSelectOption).not.toHaveBeenCalled();
    expect(onInspect).not.toHaveBeenCalled();
  });

  it('can hide row actions (selection + inspect)', () => {
    const onSelectOption = jest.fn();
    const onInspect = jest.fn();

    renderWithTheme(
      <RetentionSelector
        options={options}
        onSelectOption={onSelectOption}
        onInspect={onInspect}
        listStyle="panel"
        showRowActions={false}
        searchPlaceholder="Search policies"
        inspectButtonLabel={(name) => `Inspect ${name}`}
      />
    );

    expect(screen.queryByTestId(inspectTestSubj('Policy A'))).not.toBeInTheDocument();
  });

  it('hides inspect actions when onInspect is not provided', async () => {
    const user = userEvent.setup();
    const onSelectOption = jest.fn();

    renderWithTheme(
      <RetentionSelector
        options={options}
        onSelectOption={onSelectOption}
        searchPlaceholder="Search policies"
        inspectButtonLabel={(name) => `Inspect ${name}`}
      />
    );

    expect(screen.queryByTestId(inspectTestSubj('Policy A'))).not.toBeInTheDocument();

    await user.click(screen.getByTestId(rowTestSubj('Policy A')));
    expect(onSelectOption).toHaveBeenCalledWith('Policy A');
  });

  it('formats description prefixes ending with ":" without a dot separator', () => {
    renderWithTheme(
      <RetentionSelector
        options={[
          {
            name: 'Policy C',
            descriptionCategory: 'Success',
            descriptionParts: ['90d', '2 phases'],
          },
        ]}
        onSelectOption={() => {}}
        searchPlaceholder="Search policies"
        inspectButtonLabel={(name) => `Inspect ${name}`}
      />
    );

    expect(screen.getByText('Success: 90d · 2 phases')).toBeInTheDocument();
  });

  it('can filter streams options by method', () => {
    renderWithTheme(
      <RetentionSelector
        options={[
          { name: 'Stream A', descriptionParts: ['60d'], method: 'a' },
          {
            name: 'Stream B',
            descriptionParts: ['policy-a'],
            badge: 'ILM',
            inspectable: true,
            method: 'b',
          },
        ]}
        onSelectOption={() => {}}
        onInspect={() => {}}
        searchPlaceholder="Search streams"
        inspectButtonLabel={(name) => `Inspect ${name}`}
        inspectPlacement="badge"
        methodFilter={{
          selectedMethods: ['b'],
          onChangeSelectedMethods: () => {},
          methodOptions: [
            { key: 'a', label: 'Method A' },
            { key: 'b', label: 'Method B' },
          ],
        }}
      />
    );

    expect(screen.queryByText('Stream A')).not.toBeInTheDocument();
    expect(screen.getByText('Stream B')).toBeInTheDocument();
    expect(screen.getByTestId('retentionSelectorMethodFilterButton')).toBeInTheDocument();
  });
});
