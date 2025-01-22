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
import { useGetProductDocStatus } from '../../api/product_docs/use_get_product_doc_status';

jest.mock('../../api/product_docs/use_install_product_doc');
jest.mock('../../api/product_docs/use_get_product_doc_status');

describe('ProductDocumentationManagement', () => {
  const mockInstallProductDoc = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    (useInstallProductDoc as jest.Mock).mockReturnValue({ mutateAsync: mockInstallProductDoc });
    (useGetProductDocStatus as jest.Mock).mockReturnValue({ status: null, isLoading: false });
    jest.clearAllMocks();
  });

  it('renders loading spinner when status is loading', async () => {
    (useGetProductDocStatus as jest.Mock).mockReturnValue({
      status: { overall: 'not_installed' },
      isLoading: true,
    });
    render(<ProductDocumentationManagement />);
    expect(screen.getByTestId('statusLoading')).toBeInTheDocument();
  });

  it('renders install button when not installed', () => {
    (useGetProductDocStatus as jest.Mock).mockReturnValue({
      status: { overall: 'not_installed' },
      isLoading: false,
    });
    render(<ProductDocumentationManagement />);
    expect(screen.getByText(i18n.INSTALL)).toBeInTheDocument();
  });

  it('does not render anything when already installed', () => {
    (useGetProductDocStatus as jest.Mock).mockReturnValue({
      status: { overall: 'installed' },
      isLoading: false,
    });
    const { container } = render(<ProductDocumentationManagement />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows installing spinner and text when installing', async () => {
    (useGetProductDocStatus as jest.Mock).mockReturnValue({
      status: { overall: 'not_installed' },
      isLoading: false,
    });
    render(<ProductDocumentationManagement />);
    fireEvent.click(screen.getByText(i18n.INSTALL));
    await waitFor(() => {
      expect(screen.getByTestId('installing')).toBeInTheDocument();
      expect(screen.getByText(i18n.INSTALLING)).toBeInTheDocument();
    });
  });

  it('sets installed state to true after successful installation', async () => {
    (useGetProductDocStatus as jest.Mock).mockReturnValue({
      status: { overall: 'not_installed' },
      isLoading: false,
    });
    mockInstallProductDoc.mockResolvedValueOnce({});
    render(<ProductDocumentationManagement />);
    fireEvent.click(screen.getByText(i18n.INSTALL));
    await waitFor(() => expect(screen.queryByText(i18n.INSTALL)).not.toBeInTheDocument());
  });

  it('sets installed state to false after failed installation', async () => {
    (useGetProductDocStatus as jest.Mock).mockReturnValue({
      status: { overall: 'not_installed' },
      isLoading: false,
    });
    mockInstallProductDoc.mockRejectedValueOnce(new Error('Installation failed'));
    render(<ProductDocumentationManagement />);
    fireEvent.click(screen.getByText(i18n.INSTALL));
    await waitFor(() => expect(screen.getByText(i18n.INSTALL)).toBeInTheDocument());
  });
});
