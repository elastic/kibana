/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../../../../mocks/test_provider';
import { ActionsProvider } from '../../state';
import { mockActions, mockState } from '../../mocks/state';
import { CreateCelConfigFlyout } from './create_cel_config';

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('CreateCelConfig', () => {
  let result: RenderResult;
  beforeEach(() => {
    jest.clearAllMocks();
    result = render(
      <CreateCelConfigFlyout
        integrationSettings={undefined}
        connector={mockState.connector}
        isFlyoutGenerating={false}
      />,
      { wrapper }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when open with initial state', () => {
    it('should render upload spec step', () => {
      expect(result.queryByTestId('uploadSpecStep')).toBeVisible();
    });

    it('confirm settings step collapsed', () => {
      const accordionButton = result.queryByTestId('celGenStep2')?.querySelector('button');
      // Check the aria-expanded property of the button
      const isExpanded = accordionButton?.getAttribute('aria-expanded');
      expect(isExpanded).toBe('false');

      expect(result.queryByTestId('confirmSettingsStep')).toBeNull();
    });
  });
});
