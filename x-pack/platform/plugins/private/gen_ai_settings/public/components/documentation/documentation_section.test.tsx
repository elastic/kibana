/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import type { ProductDocBasePluginStart } from '@kbn/product-doc-base-plugin/public';
import { DocumentationSection } from './documentation_section';

describe('DocumentationSection', () => {
  const coreStart = coreMock.createStart();

  const mockProductDocBase: ProductDocBasePluginStart = {
    installation: {
      getStatus: jest.fn().mockResolvedValue({
        inferenceId: '.elser-2-elasticsearch',
        overall: 'uninstalled',
        perProducts: {},
      }),
      install: jest.fn().mockResolvedValue({ installed: true }),
      uninstall: jest.fn().mockResolvedValue({ success: true }),
    },
  };

  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

  const renderComponent = (productDocBase: ProductDocBasePluginStart = mockProductDocBase) => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <KibanaContextProvider services={coreStart}>
            <DocumentationSection productDocBase={productDocBase} />
          </KibanaContextProvider>
        </I18nProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the documentation section', async () => {
      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByTestId('documentationSection')).toBeInTheDocument();
        expect(screen.getByTestId('documentationTitle')).toBeInTheDocument();
        expect(screen.getByTestId('documentationTable')).toBeInTheDocument();
      });
    });

    it('should render all documentation items', async () => {
      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByText('Elastic documents')).toBeInTheDocument();
        expect(screen.getByText('Security labs')).toBeInTheDocument();
      });
    });

    it('should show Tech Preview badge for Elastic documents', async () => {
      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByText('Tech Preview')).toBeInTheDocument();
      });
    });
  });

  describe('status display', () => {
    it('should show "Not installed" status when uninstalled', async () => {
      mockProductDocBase.installation.getStatus = jest.fn().mockResolvedValue({
        inferenceId: '.elser-2-elasticsearch',
        overall: 'uninstalled',
        perProducts: {},
      });

      renderComponent(mockProductDocBase);

      await waitFor(() => {
        const notInstalledBadges = screen.getAllByText('Not installed');
        expect(notInstalledBadges.length).toBeGreaterThan(0);
      });
    });

    it('should show "Installed" status when installed', async () => {
      mockProductDocBase.installation.getStatus = jest.fn().mockResolvedValue({
        inferenceId: '.elser-2-elasticsearch',
        overall: 'installed',
        perProducts: {},
      });

      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByText('Installed')).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    it('should show install action for uninstalled items', async () => {
      mockProductDocBase.installation.getStatus = jest.fn().mockResolvedValue({
        inferenceId: '.elser-2-elasticsearch',
        overall: 'uninstalled',
        perProducts: {},
      });

      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-install-elastic_documents')).toBeInTheDocument();
      });
    });

    it('should show uninstall action for installed items', async () => {
      mockProductDocBase.installation.getStatus = jest.fn().mockResolvedValue({
        inferenceId: '.elser-2-elasticsearch',
        overall: 'installed',
        perProducts: {},
      });

      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-uninstall-elastic_documents')).toBeInTheDocument();
      });
    });

    it('should call install when install action is clicked', async () => {
      mockProductDocBase.installation.getStatus = jest.fn().mockResolvedValue({
        inferenceId: '.elser-2-elasticsearch',
        overall: 'uninstalled',
        perProducts: {},
      });

      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-install-elastic_documents')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('documentation-install-elastic_documents'));

      await waitFor(() => {
        expect(mockProductDocBase.installation.install).toHaveBeenCalledWith({
          inferenceId: '.elser-2-elasticsearch',
        });
      });
    });

    it('should call uninstall when uninstall action is clicked', async () => {
      mockProductDocBase.installation.getStatus = jest.fn().mockResolvedValue({
        inferenceId: '.elser-2-elasticsearch',
        overall: 'installed',
        perProducts: {},
      });

      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-uninstall-elastic_documents')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('documentation-uninstall-elastic_documents'));

      await waitFor(() => {
        expect(mockProductDocBase.installation.uninstall).toHaveBeenCalledWith({
          inferenceId: '.elser-2-elasticsearch',
        });
      });
    });
  });
});
