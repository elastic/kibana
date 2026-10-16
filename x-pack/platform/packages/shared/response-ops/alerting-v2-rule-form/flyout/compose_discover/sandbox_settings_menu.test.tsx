/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SandboxSettingsMenu } from './sandbox_settings_menu';

const renderMenu = (props: Partial<React.ComponentProps<typeof SandboxSettingsMenu>> = {}) =>
  render(
    <IntlProvider locale="en">
      <SandboxSettingsMenu
        manualSplitEnabled={false}
        onEnableManualSplit={jest.fn()}
        onDisableManualSplit={jest.fn()}
        {...props}
      />
    </IntlProvider>
  );

describe('SandboxSettingsMenu', () => {
  it('keeps the menu closed until the gear button is clicked', () => {
    renderMenu();

    expect(screen.getByTestId('querySandboxSettingsButton')).toBeInTheDocument();
    expect(screen.queryByTestId('querySandboxSplitBaseAndAlert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('querySandboxSettingsButton'));

    expect(screen.getByTestId('querySandboxSplitBaseAndAlert')).toBeInTheDocument();
    expect(screen.getByTestId('querySandboxSplitBaseAndAlert')).toHaveTextContent(
      'Define condition manually'
    );
  });

  it('enables manual split when the split item is clicked', () => {
    const onEnableManualSplit = jest.fn();
    renderMenu({ onEnableManualSplit });

    fireEvent.click(screen.getByTestId('querySandboxSettingsButton'));
    fireEvent.click(screen.getByTestId('querySandboxSplitBaseAndAlert'));

    expect(onEnableManualSplit).toHaveBeenCalledTimes(1);
  });

  it('offers "Use single editor" when manual split is already enabled', () => {
    const onDisableManualSplit = jest.fn();
    renderMenu({ manualSplitEnabled: true, onDisableManualSplit });

    fireEvent.click(screen.getByTestId('querySandboxSettingsButton'));

    expect(screen.queryByTestId('querySandboxSplitBaseAndAlert')).not.toBeInTheDocument();
    const item = screen.getByTestId('querySandboxUseSingleEditor');
    expect(item).toHaveTextContent('Use single editor');

    fireEvent.click(item);

    expect(onDisableManualSplit).toHaveBeenCalledTimes(1);
  });
});
