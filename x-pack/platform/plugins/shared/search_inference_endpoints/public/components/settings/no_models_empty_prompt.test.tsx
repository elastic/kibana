/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { NoModelsEmptyPrompt } from './no_models_empty_prompt';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const mockNavigateToApp = jest.fn();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

describe('NoModelsEmptyPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        cloud: { isCloudEnabled: true },
        application: { navigateToApp: mockNavigateToApp },
      },
    });
  });

  it('renders empty prompt with title and description', () => {
    render(
      <Wrapper>
        <NoModelsEmptyPrompt />
      </Wrapper>
    );

    expect(screen.getByTestId('settings-no-models')).toBeInTheDocument();
    expect(screen.getByText('No models available')).toBeInTheDocument();
  });

  it('navigates to inference endpoints page when add models button is clicked', () => {
    render(
      <Wrapper>
        <NoModelsEmptyPrompt />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('settings-no-models-add-models'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('management', {
      path: 'modelManagement/inference_endpoints',
    });
  });

  it('renders connect EIS button when not on cloud', () => {
    mockUseKibana.mockReturnValue({
      services: {
        cloud: { isCloudEnabled: false },
        application: { navigateToApp: mockNavigateToApp },
      },
    });

    render(
      <Wrapper>
        <NoModelsEmptyPrompt />
      </Wrapper>
    );

    expect(screen.getByTestId('settings-no-models-connect-eis')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('settings-no-models-connect-eis'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('cloud_connect');
  });

  it('does not render connect EIS button when on cloud', () => {
    render(
      <Wrapper>
        <NoModelsEmptyPrompt />
      </Wrapper>
    );

    expect(screen.queryByTestId('settings-no-models-connect-eis')).not.toBeInTheDocument();
  });
});
