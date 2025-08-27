/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductDocumentationManagement } from '.';
import * as i18n from './translations';
import { useInstallProductDoc } from '../../api/product_docs/use_install_product_doc';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

jest.mock('../../api/product_docs/use_install_product_doc');
jest.mock('../../api/product_docs/use_get_product_doc_status');

describe('ProductDocumentationManagement', () => {
  const mockInstallProductDoc = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    (useInstallProductDoc as jest.Mock).mockReturnValue({
      mutateAsync: mockInstallProductDoc,
      isLoading: false,
      isSuccess: false,
    });
    jest.clearAllMocks();
  });

  it('renders install button when not installed', () => {
    render(
      <ProductDocumentationManagement
        status="uninstalled"
        inferenceId={defaultInferenceEndpoints.ELSER}
      />
    );
    expect(screen.getByText(i18n.INSTALL)).toBeInTheDocument();
  });

  it('does not render anything when already installed', () => {
    const { container } = render(
      <ProductDocumentationManagement
        status="installed"
        inferenceId={defaultInferenceEndpoints.ELSER}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render anything when the installation was started by the plugin', () => {
    (useInstallProductDoc as jest.Mock).mockReturnValue({
      mutateAsync: mockInstallProductDoc,
      isLoading: false,
      isSuccess: false,
    });
    const { container } = render(
      <ProductDocumentationManagement
        status="installing"
        inferenceId={defaultInferenceEndpoints.ELSER}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows installing spinner and text when installing', async () => {
    (useInstallProductDoc as jest.Mock).mockReturnValue({
      mutateAsync: mockInstallProductDoc,
      isLoading: true,
      isSuccess: false,
    });
    render(
      <ProductDocumentationManagement
        status="uninstalled"
        inferenceId={defaultInferenceEndpoints.ELSER}
      />
    );
    expect(screen.getByTestId('installing')).toBeInTheDocument();
    expect(screen.getByText(i18n.INSTALLING)).toBeInTheDocument();
  });

  it('sets installed state to true after successful installation', async () => {
    (useInstallProductDoc as jest.Mock).mockReturnValue({
      mutateAsync: mockInstallProductDoc,
      isLoading: false,
      isSuccess: true,
    });
    mockInstallProductDoc.mockResolvedValueOnce({});
    render(
      <ProductDocumentationManagement
        status="uninstalled"
        inferenceId={defaultInferenceEndpoints.ELSER}
      />
    );
    expect(screen.queryByText(i18n.INSTALL)).not.toBeInTheDocument();
  });

  it('sets installed state to false after failed installation', async () => {
    (useInstallProductDoc as jest.Mock).mockReturnValue({
      mutateAsync: mockInstallProductDoc,
      isLoading: false,
      isSuccess: false,
    });
    mockInstallProductDoc.mockRejectedValueOnce(new Error('Installation failed'));
    render(
      <ProductDocumentationManagement
        status="uninstalled"
        inferenceId={defaultInferenceEndpoints.ELSER}
      />
    );
    fireEvent.click(screen.getByText(i18n.INSTALL));
    await waitFor(() => expect(screen.getByText(i18n.INSTALL)).toBeInTheDocument());
  });
});
