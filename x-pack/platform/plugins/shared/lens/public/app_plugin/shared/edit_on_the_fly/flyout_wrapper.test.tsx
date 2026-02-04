/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithReduxStore } from '../../../mocks';
import { FlyoutWrapper } from './flyout_wrapper';
import type { FlyoutWrapperProps } from './types';

function mountFlyoutWrapper(propsOverrides: Partial<FlyoutWrapperProps> = {}) {
  const result = renderWithReduxStore(
    <FlyoutWrapper
      isInlineFlyoutVisible
      displayFlyoutHeader
      isScrollable
      isNewPanel
      isSaveable
      onCancel={jest.fn()}
      navigateToLensEditor={jest.fn()}
      onApply={jest.fn()}
      {...propsOverrides}
    >
      <div>Test</div>
    </FlyoutWrapper>
  );
  return {
    ...result,
    // rewrite the rerender function to work with the store wrapper
    rerender: (props: Partial<FlyoutWrapperProps>) =>
      result.rerender(
        <FlyoutWrapper
          isInlineFlyoutVisible
          displayFlyoutHeader
          isScrollable
          isNewPanel
          isSaveable
          onCancel={jest.fn()}
          navigateToLensEditor={jest.fn()}
          onApply={jest.fn()}
          {...propsOverrides}
          {...props}
        >
          <div>Test</div>
        </FlyoutWrapper>
      ),
  };
}

describe('Flyout wrapper', () => {
  describe('inline mode', () => {
    it('should enable edit actions if the panel is not in read only mode', async () => {
      mountFlyoutWrapper();

      expect(screen.queryByRole('button', { name: 'Edit in Lens' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Apply and close' })).toBeInTheDocument();
      // make sure the read only warning is not shown
      expect(
        screen.queryByText('Read-only: Changes will be reverted on close')
      ).not.toBeInTheDocument();
    });
    it('should show a warning and avoid any edit action when in read mode', async () => {
      mountFlyoutWrapper({ isReadOnly: true });

      expect(
        screen.queryByText('Read-only: Changes will be reverted on close')
      ).toBeInTheDocument();

      // make sure edit actions are not shown
      expect(screen.queryByRole('button', { name: 'Edit in Lens' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Apply and close' })).not.toBeInTheDocument();
    });

    it('should show the only a single and consistent title no matter the context', async () => {
      const component = mountFlyoutWrapper();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      component.rerender({ isNewPanel: true });
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      component.rerender({ isNewPanel: false, isReadOnly: true });
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });
  });

  describe('not inline mode', () => {
    it('should not show a warning even in read mode when not inline', async () => {
      mountFlyoutWrapper({ isReadOnly: true, isInlineFlyoutVisible: false });

      expect(
        screen.queryByText('Read only panel changes will revert after closing')
      ).not.toBeInTheDocument();
    });
  });
});
