/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../../../../../../mocks/test_provider';
import { ActionsProvider } from '../../../../state';
import { mockActions } from '../../../../mocks/state';
import { AuthSelection } from './auth_selection';

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('AuthSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when open with initial state', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <AuthSelection
          selectedAuth={'Basic'}
          specifiedAuthForPath={['Basic']}
          invalidAuth={false}
          isGenerating={false}
          showValidation={false}
          onChangeAuth={() => {}}
        />,
        { wrapper }
      );
    });

    it('should render auth selection combobox', () => {
      expect(result.queryByTestId('authInputComboBox')).toBeInTheDocument();
    });
  });

  describe('invalid auth & showing validation', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <AuthSelection
          selectedAuth={'Basic'}
          specifiedAuthForPath={['Basic']}
          invalidAuth={true}
          isGenerating={false}
          showValidation={true}
          onChangeAuth={() => {}}
        />,
        { wrapper }
      );
    });

    it('should render warning', () => {
      expect(result.queryByTestId('authDoesNotAlignWarning')).toBeInTheDocument();
    });
  });
});
