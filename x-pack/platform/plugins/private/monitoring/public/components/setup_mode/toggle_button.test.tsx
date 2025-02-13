/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { SetupModeToggleButton } from './toggle_button';

describe('ToggleButton', () => {
  describe('when setup mode is disabled', () => {
    it('should render the enter setup mode button', () => {
      const { getByText } = render(
        <SetupModeToggleButton enabled={false} toggleSetupMode={jest.fn()} />
      );
      expect(getByText('Enter setup mode')).toBeInTheDocument();
    });

    it('should call toggleSetupMode to enable setup mode', () => {
      const toggleSetupMode = jest.fn();
      const { getByText } = render(
        <SetupModeToggleButton enabled={false} toggleSetupMode={toggleSetupMode} />
      );
      act(() => {
        fireEvent.click(getByText('Enter setup mode'));
      });
      expect(toggleSetupMode).toHaveBeenCalledWith(true);
    });
  });

  describe('when setup mode is enabled', () => {
    it('should render the exit setup mode button', () => {
      const { getByText } = render(
        <SetupModeToggleButton enabled={true} toggleSetupMode={jest.fn()} />
      );
      expect(getByText('Exit setup mode')).toBeInTheDocument();
    });

    it('should call toggleSetupMode to disable setup mode', () => {
      const toggleSetupMode = jest.fn();
      const { getByText } = render(
        <SetupModeToggleButton enabled={true} toggleSetupMode={toggleSetupMode} />
      );
      act(() => {
        fireEvent.click(getByText('Exit setup mode'));
      });
      expect(toggleSetupMode).toHaveBeenCalledWith(false);
    });
  });
});
