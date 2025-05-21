/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithReduxStore } from '../mocks';
import { SettingsMenu } from './settings_menu';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('settings menu', () => {
  const onCloseMock = jest.fn();

  const renderSettingsMenu = (propsOverrides = {}) => {
    const rtlRender = renderWithReduxStore(
      <SettingsMenu
        anchorElement={document.createElement('button')}
        isOpen
        onClose={onCloseMock}
        {...propsOverrides}
      />
    );

    const toggleAutoApply = async () => {
      const autoApplyToggle = screen.getByTestId('lnsToggleAutoApply');
      await userEvent.click(autoApplyToggle);
    };

    const isAutoApplyOn = () => {
      const autoApplyToggle = screen.getByTestId('lnsToggleAutoApply');
      return autoApplyToggle.getAttribute('aria-checked') === 'true';
    };

    return {
      toggleAutoApply,
      isAutoApplyOn,
      ...rtlRender,
    };
  };

  afterEach(() => {
    onCloseMock.mockClear();
  });

  it('should call onClose when popover closes after toggling', async () => {
    const { toggleAutoApply } = renderSettingsMenu();
    await toggleAutoApply();

    await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1));
  });

  it('should toggle auto-apply', async () => {
    const { toggleAutoApply, isAutoApplyOn } = renderSettingsMenu();

    expect(isAutoApplyOn()).toBeTruthy();

    await toggleAutoApply();
    expect(isAutoApplyOn()).toBeFalsy();

    await toggleAutoApply();
    expect(isAutoApplyOn()).toBeTruthy();
  });
});
