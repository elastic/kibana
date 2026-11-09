/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mockHistoryPush }),
}));
jest.mock('../../../../../hooks', () => ({
  useLink: () => ({ getAbsolutePath: (path: string) => path }),
}));

import { CreateNewIntegrationButton } from './create_new_integration';

const renderButton = (props: { canCreate: boolean; canUpload: boolean }) =>
  render(
    <I18nProvider>
      <CreateNewIntegrationButton {...props} />
    </I18nProvider>
  );

describe('CreateNewIntegrationButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers create with an upload dropdown when the user can do both', () => {
    renderButton({ canCreate: true, canUpload: true });

    expect(screen.getByTestId('createNewIntegrationBtn')).toBeInTheDocument();
    expect(screen.getByTestId('createNewIntegrationDropdownBtn')).toBeInTheDocument();
  });

  it('offers only create when the user cannot upload packages', () => {
    renderButton({ canCreate: true, canUpload: false });

    fireEvent.click(screen.getByTestId('createNewIntegrationBtn'));

    expect(mockHistoryPush).toHaveBeenCalledWith('/create');
    expect(screen.queryByTestId('createNewIntegrationDropdownBtn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('uploadIntegrationPackageBtn')).not.toBeInTheDocument();
  });

  it('offers only upload when the user can upload packages but cannot create', () => {
    renderButton({ canCreate: false, canUpload: true });

    fireEvent.click(screen.getByTestId('uploadIntegrationPackageBtn'));

    expect(mockHistoryPush).toHaveBeenCalledWith('/upload');
    expect(screen.queryByTestId('createNewIntegrationBtn')).not.toBeInTheDocument();
  });

  it('renders nothing when the user can neither create nor upload', () => {
    const { container } = renderButton({ canCreate: false, canUpload: false });

    expect(container).toBeEmptyDOMElement();
  });
});
