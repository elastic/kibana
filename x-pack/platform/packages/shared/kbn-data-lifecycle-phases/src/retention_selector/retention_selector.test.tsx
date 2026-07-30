/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { EuiButton, EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RetentionOption } from './types';
import { RetentionSelector, RetentionSelectorSearch } from './retention_selector';

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

  it('ignores internal search value when search is hidden', async () => {
    const user = userEvent.setup();

    const ToggleSearchExample = () => {
      const [showSearch, setShowSearch] = useState(true);

      return (
        <>
          <EuiButton onClick={() => setShowSearch(false)}>Hide search</EuiButton>
          <RetentionSelector
            options={options}
            onSelectOption={() => {}}
            showSearch={showSearch}
            listStyle={showSearch ? 'plain' : 'panel'}
            showRowActions={showSearch}
            searchPlaceholder="Search policies"
            inspectButtonLabel={(name) => `Inspect ${name}`}
          />
        </>
      );
    };

    renderWithTheme(<ToggleSearchExample />);

    await user.type(screen.getByTestId('retentionSelectorSearchInput'), 'b');
    expect(screen.queryByTestId(rowTestSubj('Policy A'))).not.toBeInTheDocument();
    expect(screen.getByTestId(rowTestSubj('Policy B'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hide search' }));

    expect(screen.getByTestId(rowTestSubj('Policy A'))).toBeInTheDocument();
    expect(screen.getByTestId(rowTestSubj('Policy B'))).toBeInTheDocument();
    expect(screen.queryByTestId('retentionSelectorSearchInput')).not.toBeInTheDocument();
  });

  describe('managed policies', () => {
    const managedOption: RetentionOption = {
      name: 'Managed Policy',
      descriptionParts: ['hot', '30d'],
      isManaged: true,
    };
    const unmanagedOption: RetentionOption = {
      name: 'Regular Policy',
      descriptionParts: ['warm', '60d'],
      isManaged: false,
    };
    const mixedOptions = [managedOption, unmanagedOption];

    it('hides managed policies by default when managed options are present', () => {
      renderWithTheme(
        <RetentionSelector
          options={mixedOptions}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      expect(screen.queryByTestId(rowTestSubj('Managed Policy'))).not.toBeInTheDocument();
      expect(screen.getByTestId(rowTestSubj('Regular Policy'))).toBeInTheDocument();
    });

    it('keeps a managed policy visible while it is the selected option', () => {
      renderWithTheme(
        <RetentionSelector
          options={mixedOptions}
          selectedOptionName="Managed Policy"
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      // The managed policy is selected, so it stays visible (with its badge) even though the
      // managed filter is off by default.
      expect(screen.getByTestId(rowTestSubj('Managed Policy'))).toBeInTheDocument();
      expect(screen.getByTestId('retentionSelectorManagedBadge')).toBeInTheDocument();
    });

    it('shows a selected managed policy in read-only inherited mode (no search, single option)', () => {
      renderWithTheme(
        <RetentionSelector
          options={[managedOption]}
          selectedOptionName="Managed Policy"
          onSelectOption={() => {}}
          isDisabled
          showSearch={false}
          listStyle="panel"
          showRowActions={false}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      expect(screen.getByTestId(rowTestSubj('Managed Policy'))).toBeInTheDocument();
      const badge = screen.getByTestId('retentionSelectorManagedBadge');
      expect(badge).toBeInTheDocument();
      // In the read-only inherited view the whole selector is disabled, so the badge should
      // render in its disabled state too.
      expect(badge.className).toContain('euiBadge-disabled');
    });

    it('shows the "Managed" filter toggle when managed options exist', () => {
      renderWithTheme(
        <RetentionSelector
          options={mixedOptions}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      expect(screen.getByTestId('retentionSelectorIncludeManagedFilter')).toBeInTheDocument();
    });

    it('does not show the managed filter toggle when no managed options exist', () => {
      renderWithTheme(
        <RetentionSelector
          options={options}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      expect(screen.queryByTestId('retentionSelectorIncludeManagedFilter')).not.toBeInTheDocument();
    });

    it('labels the managed filter toggle "Managed"', () => {
      renderWithTheme(
        <RetentionSelector
          options={mixedOptions}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      expect(screen.getByTestId('retentionSelectorIncludeManagedFilter')).toHaveTextContent(
        'Managed'
      );
    });

    it('hides the managed filter and shows managed policies when showManagedFilter is false', () => {
      renderWithTheme(
        <RetentionSelector
          options={mixedOptions}
          showManagedFilter={false}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      // No toggle, and managed policies are not filtered out.
      expect(screen.queryByTestId('retentionSelectorIncludeManagedFilter')).not.toBeInTheDocument();
      expect(screen.getByTestId(rowTestSubj('Managed Policy'))).toBeInTheDocument();
      expect(screen.getByTestId(rowTestSubj('Regular Policy'))).toBeInTheDocument();
    });

    it('forces the managed filter to show when showManagedFilter is true even without managed options', () => {
      renderWithTheme(
        <RetentionSelector
          options={options}
          showManagedFilter={true}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      expect(screen.getByTestId('retentionSelectorIncludeManagedFilter')).toBeInTheDocument();
    });

    it('reflects the toggle state via aria-pressed (unchecked by default, checked once activated)', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <RetentionSelector
          options={mixedOptions}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      const toggle = screen.getByTestId('retentionSelectorIncludeManagedFilter');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'true');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows managed policies when the filter toggle is activated', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <RetentionSelector
          options={mixedOptions}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      expect(screen.queryByTestId(rowTestSubj('Managed Policy'))).not.toBeInTheDocument();

      await user.click(screen.getByTestId('retentionSelectorIncludeManagedFilter'));

      expect(screen.getByTestId(rowTestSubj('Managed Policy'))).toBeInTheDocument();
      expect(screen.getByTestId(rowTestSubj('Regular Policy'))).toBeInTheDocument();
    });

    it('re-hides managed policies when the filter toggle is deactivated', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <RetentionSelector
          options={mixedOptions}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      await user.click(screen.getByTestId('retentionSelectorIncludeManagedFilter'));
      expect(screen.getByTestId(rowTestSubj('Managed Policy'))).toBeInTheDocument();

      await user.click(screen.getByTestId('retentionSelectorIncludeManagedFilter'));
      expect(screen.queryByTestId(rowTestSubj('Managed Policy'))).not.toBeInTheDocument();
    });

    it('renders a "Managed" badge on managed policy rows', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <RetentionSelector
          options={mixedOptions}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      await user.click(screen.getByTestId('retentionSelectorIncludeManagedFilter'));

      const badge = screen.getByTestId('retentionSelectorManagedBadge');
      expect(badge).toBeInTheDocument();
      // When the selector is interactive the badge should not be in its disabled state.
      expect(badge.className).not.toContain('euiBadge-disabled');
    });

    it('renders both the "Managed" badge and the inspect button on a managed, inspectable row', async () => {
      const user = userEvent.setup();
      const onInspect = jest.fn();
      const managedInspectableOption: RetentionOption = {
        name: 'Managed Inspectable',
        descriptionParts: ['hot', '30d'],
        isManaged: true,
        inspectable: true,
      };

      renderWithTheme(
        <RetentionSelector
          options={[managedInspectableOption]}
          showManagedFilter={false}
          onSelectOption={() => {}}
          onInspect={onInspect}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      expect(screen.getByTestId('retentionSelectorManagedBadge')).toBeInTheDocument();
      expect(screen.getByTestId(inspectTestSubj('Managed Inspectable'))).toBeInTheDocument();

      await user.click(screen.getByTestId(inspectTestSubj('Managed Inspectable')));
      expect(onInspect).toHaveBeenCalledWith('Managed Inspectable');
    });

    it('does not render a "Managed" badge on unmanaged policy rows', () => {
      renderWithTheme(
        <RetentionSelector
          options={[unmanagedOption]}
          onSelectOption={() => {}}
          searchPlaceholder="Search policies"
          inspectButtonLabel={(name) => `Inspect ${name}`}
        />
      );

      expect(screen.queryByTestId('retentionSelectorManagedBadge')).not.toBeInTheDocument();
    });
  });

  describe('split search (RetentionSelectorSearch + showSearch={false})', () => {
    const SplitExample = () => {
      const [searchValue, setSearchValue] = useState('');
      return (
        <>
          <RetentionSelectorSearch
            searchValue={searchValue}
            onSearchValueChange={setSearchValue}
            searchPlaceholder="Search policies"
          />
          <RetentionSelector
            options={options}
            onSelectOption={() => {}}
            showSearch={false}
            searchValue={searchValue}
            searchPlaceholder="Search policies"
            inspectButtonLabel={(name) => `Inspect ${name}`}
          />
        </>
      );
    };

    it('renders only one search input, in the split-out component', () => {
      renderWithTheme(<SplitExample />);
      expect(screen.getAllByTestId('retentionSelectorSearchInput')).toHaveLength(1);
    });

    it('filters the externally-rendered list by the header search value', async () => {
      const user = userEvent.setup();
      renderWithTheme(<SplitExample />);

      expect(screen.getByTestId(rowTestSubj('Policy A'))).toBeInTheDocument();
      expect(screen.getByTestId(rowTestSubj('Policy B'))).toBeInTheDocument();

      await user.type(screen.getByTestId('retentionSelectorSearchInput'), 'b');

      expect(screen.queryByTestId(rowTestSubj('Policy A'))).not.toBeInTheDocument();
      expect(screen.getByTestId(rowTestSubj('Policy B'))).toBeInTheDocument();
    });
  });
});
