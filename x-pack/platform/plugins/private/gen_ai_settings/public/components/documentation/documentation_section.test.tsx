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
import { ResourceTypes } from '@kbn/product-doc-common';
import { DocumentationSection } from './documentation_section';

describe('DocumentationSection', () => {
  const coreStart = coreMock.createStart();

  const mockProductDocBase: ProductDocBasePluginStart = {
    installation: {
      getStatus: jest.fn().mockImplementation(({ resourceType }) => {
        if (resourceType === ResourceTypes.securityLabs) {
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            resourceType: ResourceTypes.securityLabs,
            status: 'uninstalled',
          });
        }
        return Promise.resolve({
          inferenceId: '.elser-2-elasticsearch',
          overall: 'uninstalled',
          perProducts: {},
        });
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

  const renderComponent = (
    productDocBase: ProductDocBasePluginStart = mockProductDocBase,
    hasManagePrivilege: boolean = true
  ) => {
    const queryClient = createQueryClient();
    // Set capabilities directly on the mock before rendering
    (coreStart.application.capabilities as Record<string, Record<string, boolean>>).agentBuilder = {
      show: true,
      manageAgents: hasManagePrivilege,
    };
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
        expect(screen.getByText('Elastic documentation')).toBeInTheDocument();
        expect(screen.getByText('Security labs')).toBeInTheDocument();
      });
    });
  });

  describe('status display', () => {
    it('should show "Not installed" status when uninstalled', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'uninstalled',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'uninstalled',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase);

      await waitFor(() => {
        const notInstalledBadges = screen.getAllByText('Not installed');
        expect(notInstalledBadges.length).toBeGreaterThan(0);
      });
    });

    it('should show "Installed" status when installed', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'installed',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'installed',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getAllByText('Installed').length).toBeGreaterThan(0);
      });
    });
  });

  describe('actions', () => {
    it('should show install action for uninstalled items', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'uninstalled',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'uninstalled',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-install-elastic_documents')).toBeInTheDocument();
        expect(screen.getByTestId('documentation-install-security_labs')).toBeInTheDocument();
      });
    });

    it('should show uninstall action for installed items', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'installed',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'installed',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-uninstall-elastic_documents')).toBeInTheDocument();
        expect(screen.getByTestId('documentation-uninstall-security_labs')).toBeInTheDocument();
      });
    });

    it('should call install when install action is clicked', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'uninstalled',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'uninstalled',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase, true);

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

    it('should call install for Security Labs when install action is clicked', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'uninstalled',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'uninstalled',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase, true);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-install-security_labs')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('documentation-install-security_labs'));

      await waitFor(() => {
        expect(mockProductDocBase.installation.install).toHaveBeenCalledWith({
          inferenceId: '.elser-2-elasticsearch',
          resourceType: ResourceTypes.securityLabs,
        });
      });
    });

    it('should show update action when Security Labs has an update available and call install on click', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'installed',
              isUpdateAvailable: true,
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'installed',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase, true);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-update-security_labs')).toBeInTheDocument();
        expect(screen.getByTestId('documentation-uninstall-security_labs')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('documentation-update-security_labs'));

      await waitFor(() => {
        expect(mockProductDocBase.installation.install).toHaveBeenCalledWith({
          inferenceId: '.elser-2-elasticsearch',
          resourceType: ResourceTypes.securityLabs,
        });
      });
    });

    it('should call uninstall when uninstall action is clicked', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'installed',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'installed',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase, true);

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

    it('should call uninstall for Security Labs when uninstall action is clicked', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'installed',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'installed',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase, true);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-uninstall-security_labs')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('documentation-uninstall-security_labs'));

      await waitFor(() => {
        expect(mockProductDocBase.installation.uninstall).toHaveBeenCalledWith({
          inferenceId: '.elser-2-elasticsearch',
          resourceType: ResourceTypes.securityLabs,
        });
      });
    });
  });

  describe('RBAC - insufficient privileges', () => {
    it('should disable install button when user lacks manage privilege', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'uninstalled',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'uninstalled',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase, false);

      await waitFor(() => {
        const installButton = screen.getByTestId('documentation-install-elastic_documents');
        expect(installButton).toBeInTheDocument();
        expect(installButton).toBeDisabled();
      });
    });

    it('should disable uninstall button when user lacks manage privilege', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'installed',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'installed',
            perProducts: {},
          });
        });

      renderComponent(mockProductDocBase, false);

      await waitFor(() => {
        const uninstallButton = screen.getByTestId('documentation-uninstall-elastic_documents');
        expect(uninstallButton).toBeInTheDocument();
        expect(uninstallButton).toBeDisabled();
      });
    });

    it('should not call install when install button is clicked without privilege', async () => {
      mockProductDocBase.installation.getStatus = jest.fn().mockResolvedValue({
        inferenceId: '.elser-2-elasticsearch',
        overall: 'uninstalled',
        perProducts: {},
      });

      renderComponent(mockProductDocBase, false);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-install-elastic_documents')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('documentation-install-elastic_documents'));

      // Wait a bit to ensure no call was made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockProductDocBase.installation.install).not.toHaveBeenCalled();
    });

    it('should not call uninstall when uninstall button is clicked without privilege', async () => {
      mockProductDocBase.installation.getStatus = jest.fn().mockResolvedValue({
        inferenceId: '.elser-2-elasticsearch',
        overall: 'installed',
        perProducts: {},
      });

      renderComponent(mockProductDocBase, false);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-uninstall-elastic_documents')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('documentation-uninstall-elastic_documents'));

      // Wait a bit to ensure no call was made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockProductDocBase.installation.uninstall).not.toHaveBeenCalled();
    });
  });
});
