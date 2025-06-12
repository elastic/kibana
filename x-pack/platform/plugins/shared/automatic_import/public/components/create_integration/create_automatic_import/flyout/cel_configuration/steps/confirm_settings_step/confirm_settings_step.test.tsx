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
import { mockActions, mockState } from '../../../../mocks/state';
import { ConfirmSettingsStep } from './confirm_settings_step';

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

jest.mock('@elastic/eui', () => {
  return {
    ...jest.requireActual('@elastic/eui'),
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: { onChange: (options: unknown) => void; 'data-test-subj': string }) => (
      <input
        data-test-subj={props['data-test-subj']}
        onChange={(syntheticEvent) => {
          props.onChange([{ value: syntheticEvent.target.value }]);
        }}
      />
    ),
  };
});

describe('ConfirmSettingsStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when open with initial state', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <ConfirmSettingsStep
          integrationSettings={undefined}
          connector={mockState.connector}
          isFlyoutGenerating={false}
          suggestedPaths={['/path1', '/path2', '/path3']}
          showValidation={false}
          onShowValidation={() => {}}
          onUpdateValidation={() => {}}
          onUpdateNeedsGeneration={() => {}}
          onCelInputGenerationComplete={() => {}}
        />,
        { wrapper }
      );
    });

    it('should render confirm settings step', () => {
      expect(result.queryByTestId('suggestedPathsRadioGroup')).toBeInTheDocument();
      expect(result.queryByTestId('authInputComboBox')).toBeInTheDocument();
    });

    it('generate button enabled', () => {
      expect(result.queryByTestId('generateCelInputButton')).toBeEnabled();
    });
  });

  describe('generating in progress', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <ConfirmSettingsStep
          integrationSettings={undefined}
          connector={mockState.connector}
          isFlyoutGenerating={true}
          suggestedPaths={['/path1', '/path2', '/path3']}
          showValidation={false}
          onShowValidation={() => {}}
          onUpdateValidation={() => {}}
          onUpdateNeedsGeneration={() => {}}
          onCelInputGenerationComplete={() => {}}
        />,
        { wrapper }
      );
    });

    it('generate button disabled; cancel button appears and is enabled', () => {
      expect(result.queryByTestId('generateCelInputButton')).toBeDisabled();
      expect(result.queryByTestId('cancelCelGenerationButton')).toBeVisible();
    });
  });
});
