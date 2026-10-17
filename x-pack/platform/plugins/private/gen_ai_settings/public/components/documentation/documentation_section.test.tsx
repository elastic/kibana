/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import type { ProductDocBasePluginStart } from '@kbn/product-doc-base-plugin/public';
import { ResourceTypes } from '@kbn/product-doc-common';
import { DocumentationSection } from './documentation_section';

jest.mock('@kbn/react-kibana-mount', () => ({
  // In unit tests we don't need a real MountPoint; returning the node allows us to assert on its contents.
  toMountPoint: (node: unknown) => node,
}));

describe('DocumentationSection', () => {
  const coreStart = coreMock.createStart();
  const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
  const formatUiDate = (value: string) => moment(value).tz('UTC').format(dateFormat);

  const openRowActions = (id: string) => {
    fireEvent.click(screen.getByTestId(`documentation-actions-${id}`));
  };

  const openInstallUpdate = (id: string) => {
    fireEvent.click(screen.getByTestId(`documentation-install-update-${id}`));
  };

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
      updateAll: jest.fn().mockResolvedValue({ installed: true }),
      uninstall: jest.fn().mockResolvedValue({ success: true }),
      getDefaultInferenceId: jest.fn().mockResolvedValue('.elser-2-elasticsearch'),
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (coreStart.uiSettings.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'dateFormat') {
        return dateFormat;
      }
      if (key === 'dateFormat:tz') {
        return 'UTC';
      }
    });
    mockProductDocBase.installation.install = jest.fn().mockResolvedValue({ installed: true });
    mockProductDocBase.installation.updateAll = jest.fn().mockResolvedValue({ installed: true });
    mockProductDocBase.installation.uninstall = jest.fn().mockResolvedValue({ success: true });
    mockProductDocBase.installation.getDefaultInferenceId = jest
      .fn()
      .mockResolvedValue('.elser-2-elasticsearch');
    mockProductDocBase.installation.getStatus = jest.fn().mockImplementation(({ resourceType }) => {
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

    it('should render a "Learn more" link in the description', async () => {
      renderComponent(mockProductDocBase);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Learn more/ })).toHaveAttribute(
          'href',
          coreStart.docLinks.links.aiAssistantSettings
        );
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
    it('should not render a Status column when uninstalled', async () => {
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
      expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument();
      expect(screen.queryByText('Not installed')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('documentation-version-badge-elastic_documents')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('documentation-version-badge-security_labs')
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Details' })).not.toBeInTheDocument();
    });

    it('should show a version badge that opens current documentation details on click', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'installed',
              updatedAt: '2026-09-17T15:06:00.000Z',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'installed',
            perProducts: {
              kibana: {
                status: 'installed',
                version: '9.2',
                updatedAt: '2026-09-17T15:04:00.000Z',
              },
              elasticsearch: {
                status: 'installed',
                version: '9.2',
                updatedAt: '2026-09-17T15:06:00.000Z',
              },
            },
          });
        });

      renderComponent(mockProductDocBase);

      const elasticBadge = await screen.findByTestId(
        'documentation-version-badge-elastic_documents'
      );
      expect(elasticBadge).toHaveTextContent('9.2');
      expect(elasticBadge.querySelector('[data-euiicon-type="info"]')).toBeInTheDocument();
      expect(
        screen.queryByTestId('documentation-update-available-elastic_documents')
      ).not.toBeInTheDocument();
      fireEvent.click(elasticBadge);

      const securityLabsBadge = screen.getByTestId('documentation-version-badge-security_labs');
      fireEvent.click(securityLabsBadge);

      expect(screen.getByTestId('documentation-installed-at-elastic_documents')).toHaveTextContent(
        formatUiDate('2026-09-17T15:06:00.000Z')
      );
      expect(screen.getByTestId('documentation-installed-at-security_labs')).toHaveTextContent(
        formatUiDate('2026-09-17T15:06:00.000Z')
      );
      expect(screen.getByTestId('documentation-details-elastic_documents')).toHaveTextContent(
        'Installed:'
      );
      expect(screen.getByTestId('documentation-version-at-elastic_documents')).toHaveTextContent(
        '9.2'
      );
      expect(screen.getAllByText('Current documentation').length).toBe(2);
      expect(
        screen.queryByTestId('documentation-modified-at-elastic_documents')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('documentation-version-at-security_labs')
      ).not.toBeInTheDocument();
    });

    it('should show the version on the badge and in the popover when an artifact date is present', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'installed',
              updatedAt: '2026-09-17T15:06:00.000Z',
              artifactLastModified: '2026-01-27T23:25:54.000Z',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'installed',
            perProducts: {
              kibana: {
                status: 'installed',
                version: '9.2',
                updatedAt: '2026-09-17T15:04:00.000Z',
                artifactLastModified: '2026-01-20T10:00:00.000Z',
              },
              elasticsearch: {
                status: 'installed',
                version: '9.2',
                updatedAt: '2026-09-17T15:06:00.000Z',
                artifactLastModified: '2026-01-27T23:25:54.000Z',
              },
            },
          });
        });

      renderComponent(mockProductDocBase);

      expect(
        await screen.findByTestId('documentation-version-badge-elastic_documents')
      ).toHaveTextContent('9.2');
      expect(screen.getByTestId('documentation-version-badge-security_labs')).toHaveTextContent(
        formatUiDate('2026-01-27T23:25:54.000Z')
      );

      fireEvent.click(screen.getByTestId('documentation-version-badge-elastic_documents'));
      fireEvent.click(screen.getByTestId('documentation-version-badge-security_labs'));

      expect(screen.getByTestId('documentation-version-at-elastic_documents')).toHaveTextContent(
        '9.2'
      );
      expect(screen.getByTestId('documentation-version-at-security_labs')).toHaveTextContent(
        formatUiDate('2026-01-27T23:25:54.000Z')
      );
      expect(
        screen.queryByTestId('documentation-modified-at-elastic_documents')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('documentation-installed-at-elastic_documents')).toHaveTextContent(
        formatUiDate('2026-09-17T15:06:00.000Z')
      );
      expect(screen.getByTestId('documentation-installed-at-security_labs')).toHaveTextContent(
        formatUiDate('2026-09-17T15:06:00.000Z')
      );
    });

    it('should show the Security Labs content version on the badge', async () => {
      mockProductDocBase.installation.getDefaultInferenceId = jest
        .fn()
        .mockResolvedValue('.jina-embeddings-v5-text');
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.jina-embeddings-v5-text',
              resourceType: ResourceTypes.securityLabs,
              status: 'installed',
              version: '2025.12.12',
              updatedAt: '2026-10-13T00:00:00.000Z',
            });
          }
          return Promise.resolve({
            inferenceId: '.jina-embeddings-v5-text',
            overall: 'installed',
            perProducts: {
              kibana: {
                status: 'installed',
                version: '9.6',
                updatedAt: '2026-10-13T00:00:00.000Z',
              },
            },
          });
        });

      renderComponent(mockProductDocBase);

      expect(
        await screen.findByTestId('documentation-version-badge-security_labs')
      ).toHaveTextContent('2025.12.12');
      expect(screen.getByTestId('documentation-version-badge-elastic_documents')).toHaveTextContent(
        '9.6'
      );

      fireEvent.click(screen.getByTestId('documentation-version-badge-security_labs'));

      expect(screen.getByText('Current documentation')).toBeInTheDocument();
      expect(screen.getByTestId('documentation-version-at-security_labs')).toHaveTextContent(
        '2025.12.12'
      );
      expect(screen.getByTestId('documentation-inference-model-security_labs')).toHaveTextContent(
        '.jina-embeddings-v5-text'
      );
      expect(screen.getByTestId('documentation-installed-at-security_labs')).toHaveTextContent(
        formatUiDate('2026-10-13T00:00:00.000Z')
      );
    });

    it('should show the inference model in the version popover when installed', async () => {
      mockProductDocBase.installation.getStatus = jest
        .fn()
        .mockImplementation(({ resourceType }) => {
          if (resourceType === ResourceTypes.securityLabs) {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              resourceType: ResourceTypes.securityLabs,
              status: 'installed',
              updatedAt: '2026-09-17T15:06:00.000Z',
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'installed',
            perProducts: {
              kibana: {
                status: 'installed',
                version: '9.2',
                updatedAt: '2026-09-17T15:04:00.000Z',
              },
            },
          });
        });

      renderComponent(mockProductDocBase);

      fireEvent.click(await screen.findByTestId('documentation-version-badge-elastic_documents'));
      fireEvent.click(screen.getByTestId('documentation-version-badge-security_labs'));

      expect(
        screen.getByTestId('documentation-inference-model-elastic_documents')
      ).toHaveTextContent('.elser-2-elasticsearch');
      expect(screen.getByTestId('documentation-inference-model-security_labs')).toHaveTextContent(
        '.elser-2-elasticsearch'
      );
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

    it('should disable install actions while the default inference id is resolving', async () => {
      let resolveInferenceId: (value: string) => void;
      const inferenceIdPromise = new Promise<string>((resolve) => {
        resolveInferenceId = resolve;
      });

      mockProductDocBase.installation.getDefaultInferenceId = jest
        .fn()
        .mockReturnValue(inferenceIdPromise);
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

      const installButton = screen.getByTestId('documentation-install-elastic_documents');
      expect(installButton).toBeDisabled();

      fireEvent.click(installButton);
      expect(mockProductDocBase.installation.install).not.toHaveBeenCalled();

      resolveInferenceId!('.jina-embeddings-v5-text-small');

      await waitFor(() => {
        expect(installButton).not.toBeDisabled();
      });

      fireEvent.click(installButton);

      await waitFor(() => {
        expect(mockProductDocBase.installation.install).toHaveBeenCalledWith({
          inferenceId: '.jina-embeddings-v5-text-small',
          resourceType: ResourceTypes.productDoc,
        });
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
        const elasticDocumentsBadge = screen.getByTestId(
          'documentation-installed-badge-elastic_documents'
        );
        const securityLabsBadge = screen.getByTestId('documentation-installed-badge-security_labs');
        expect(elasticDocumentsBadge).toHaveTextContent('Installed');
        expect(
          elasticDocumentsBadge.querySelector('[data-euiicon-type="check"]')
        ).toBeInTheDocument();
        expect(securityLabsBadge).toHaveTextContent('Installed');
        expect(securityLabsBadge.querySelector('[data-euiicon-type="check"]')).toBeInTheDocument();
      });
      openRowActions('elastic_documents');
      openRowActions('security_labs');
      const elasticDocumentsUninstall = screen.getByTestId(
        'documentation-uninstall-elastic_documents'
      );
      const securityLabsUninstall = screen.getByTestId('documentation-uninstall-security_labs');
      expect(elasticDocumentsUninstall).toBeInTheDocument();
      expect(
        elasticDocumentsUninstall.querySelector('[data-euiicon-type="trash"]')
      ).toBeInTheDocument();
      expect(securityLabsUninstall).toBeInTheDocument();
      expect(
        securityLabsUninstall.querySelector('[data-euiicon-type="trash"]')
      ).toBeInTheDocument();
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

      const initialCalls = (mockProductDocBase.installation.getStatus as jest.Mock).mock.calls
        .length;
      fireEvent.click(screen.getByTestId('documentation-install-elastic_documents'));

      await waitFor(() => {
        expect(mockProductDocBase.installation.install).toHaveBeenCalledWith({
          inferenceId: '.elser-2-elasticsearch',
          resourceType: ResourceTypes.productDoc,
        });
      });

      // Regression: successful install should invalidate/refetch status without requiring a page refresh.
      await waitFor(() => {
        const calls = (mockProductDocBase.installation.getStatus as jest.Mock).mock.calls.length;
        expect(calls).toBeGreaterThan(initialCalls);
      });
    });

    it('should show a helpful toast (air-gapped hint + docs link) when install fails', async () => {
      mockProductDocBase.installation.getStatus = jest.fn().mockResolvedValue({
        inferenceId: '.elser-2-elasticsearch',
        overall: 'uninstalled',
        perProducts: {},
      });
      mockProductDocBase.installation.install = jest.fn().mockRejectedValue(new Error('boom'));

      renderComponent(mockProductDocBase, true);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-install-elastic_documents')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('documentation-install-elastic_documents'));

      await waitFor(() => {
        expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalled();
      });

      const toastArg = (coreStart.notifications.toasts.addDanger as jest.Mock).mock.calls[0][0];
      expect(toastArg.title).toBe('Failed to install Elastic documentation');

      // toMountPoint is mocked to return a React node, so we can assert on its contents.
      const { container } = render(<>{toastArg.text}</>);
      const toast = within(container);
      expect(
        toast.getByText(
          'If your environment has no internet access, you can host these artifacts yourself.'
        )
      ).toBeInTheDocument();
      expect(toast.getByRole('link', { name: /Learn more/ })).toHaveAttribute(
        'href',
        coreStart.docLinks.links.aiAssistantSettings
      );
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

    it('keeps both rows in an installing UI state for back-to-back install clicks', async () => {
      // Make installs never resolve so the mutation stays "loading"
      const never = new Promise(() => {});
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
      mockProductDocBase.installation.install = jest.fn().mockReturnValue(never as any);

      renderComponent(mockProductDocBase, true);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-install-elastic_documents')).toBeInTheDocument();
        expect(screen.getByTestId('documentation-install-security_labs')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('documentation-install-elastic_documents'));
      fireEvent.click(screen.getByTestId('documentation-install-security_labs'));

      await waitFor(() => {
        expect(
          screen.getByTestId('documentation-installing-elastic_documents')
        ).toBeInTheDocument();
        expect(screen.getByTestId('documentation-installing-security_labs')).toBeInTheDocument();
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
        expect(screen.getByTestId('documentation-install-update-security_labs')).toHaveTextContent(
          'Install update'
        );
      });
      expect(screen.getByTestId('documentation-update-available-security_labs')).toHaveTextContent(
        'Update available'
      );
      expect(
        screen.queryByTestId('documentation-update-available-elastic_documents')
      ).not.toBeInTheDocument();
      openRowActions('security_labs');
      expect(screen.getByTestId('documentation-uninstall-security_labs')).toBeInTheDocument();

      openInstallUpdate('security_labs');
      fireEvent.click(screen.getByTestId('documentation-update-security_labs'));

      await waitFor(() => {
        expect(mockProductDocBase.installation.install).toHaveBeenCalledWith({
          inferenceId: '.elser-2-elasticsearch',
          resourceType: ResourceTypes.securityLabs,
        });
      });
    });

    it('should show update action for Elastic docs and call updateAll with forceUpdate', async () => {
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
            isUpdateAvailable: true,
            availableArtifactLastModified: '2026-03-01T12:00:00.000Z',
            availableStackVersion: '9.2',
            perProducts: {
              kibana: {
                status: 'installed',
                version: '9.2',
                artifactLastModified: '2026-01-01T12:00:00.000Z',
              },
            },
          });
        });

      renderComponent(mockProductDocBase, true);

      await waitFor(() => {
        expect(
          screen.getByTestId('documentation-install-update-elastic_documents')
        ).toHaveTextContent('Install update');
      });
      const updateBadge = screen.getByTestId('documentation-update-available-elastic_documents');
      expect(updateBadge).toHaveTextContent('Update available');
      expect(updateBadge.className).toContain('success');
      expect(
        screen.queryByTestId('documentation-update-available-security_labs')
      ).not.toBeInTheDocument();

      openInstallUpdate('elastic_documents');
      expect(screen.getByText('New version')).toBeInTheDocument();
      expect(
        screen.getByTestId('documentation-update-version-elastic_documents')
      ).toHaveTextContent('9.2');
      expect(screen.getByTestId('documentation-update-date-elastic_documents')).toHaveTextContent(
        formatUiDate('2026-03-01T12:00:00.000Z')
      );
      fireEvent.click(screen.getByTestId('documentation-version-badge-elastic_documents'));
      expect(screen.getByTestId('documentation-version-at-elastic_documents')).toHaveTextContent(
        '9.2'
      );

      fireEvent.click(screen.getByTestId('documentation-update-elastic_documents'));

      await waitFor(() => {
        expect(mockProductDocBase.installation.updateAll).toHaveBeenCalledWith({
          forceUpdate: true,
          inferenceIds: ['.elser-2-elasticsearch'],
        });
        expect(mockProductDocBase.installation.install).not.toHaveBeenCalled();
      });

      expect(coreStart.notifications.toasts.addInfo).toHaveBeenCalledWith({
        title: 'Updating to newest version',
      });
      expect(screen.getByTestId('documentation-updating-elastic_documents')).toHaveTextContent(
        'Updating'
      );
      expect(coreStart.notifications.toasts.addSuccess).not.toHaveBeenCalled();
    });

    it('should keep Updating until the background install finishes', async () => {
      let phase: 'available' | 'installing' | 'done' = 'available';
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
          if (phase === 'installing') {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              overall: 'installing',
              isUpdateAvailable: true,
              perProducts: {},
            });
          }
          if (phase === 'done') {
            return Promise.resolve({
              inferenceId: '.elser-2-elasticsearch',
              overall: 'installed',
              isUpdateAvailable: false,
              perProducts: {
                kibana: {
                  status: 'installed',
                  version: '9.2',
                  artifactLastModified: '2026-03-01T12:00:00.000Z',
                  updatedAt: '2026-03-01T12:05:00.000Z',
                },
              },
            });
          }
          return Promise.resolve({
            inferenceId: '.elser-2-elasticsearch',
            overall: 'installed',
            isUpdateAvailable: true,
            availableArtifactLastModified: '2026-03-01T12:00:00.000Z',
            availableStackVersion: '9.2',
            perProducts: {
              kibana: {
                status: 'installed',
                version: '9.2',
                artifactLastModified: '2026-01-01T12:00:00.000Z',
                updatedAt: '2026-01-01T12:00:00.000Z',
              },
            },
          });
        });

      const realSetInterval = window.setInterval.bind(window);
      const pollers: Array<() => void> = [];
      jest.spyOn(window, 'setInterval').mockImplementation(((
        handler: TimerHandler,
        timeout?: number,
        ...args: unknown[]
      ) => {
        if (typeof handler === 'function' && timeout === 2000) {
          pollers.push(() => {
            handler();
          });
          return 1 as unknown as ReturnType<typeof setInterval>;
        }
        return realSetInterval(handler, timeout as number, ...(args as []));
      }) as typeof window.setInterval);

      renderComponent(mockProductDocBase, true);

      await waitFor(() => {
        expect(
          screen.getByTestId('documentation-install-update-elastic_documents')
        ).toBeInTheDocument();
      });

      openInstallUpdate('elastic_documents');
      fireEvent.click(screen.getByTestId('documentation-update-elastic_documents'));

      await waitFor(() => {
        expect(screen.getByTestId('documentation-updating-elastic_documents')).toHaveTextContent(
          'Updating'
        );
      });
      expect(coreStart.notifications.toasts.addSuccess).not.toHaveBeenCalled();

      phase = 'installing';
      pollers.forEach((poll) => poll());

      await waitFor(() => {
        expect(screen.getByTestId('documentation-updating-elastic_documents')).toHaveAttribute(
          'data-status',
          'installing'
        );
      });
      expect(screen.getByTestId('documentation-updating-elastic_documents')).toHaveTextContent(
        'Updating'
      );
      expect(coreStart.notifications.toasts.addSuccess).not.toHaveBeenCalled();

      phase = 'done';
      pollers.forEach((poll) => poll());

      await waitFor(() => {
        expect(
          screen.queryByTestId('documentation-updating-elastic_documents')
        ).not.toBeInTheDocument();
        expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          title: 'Elastic documentation updated successfully',
        });
      });
      openRowActions('elastic_documents');
      expect(screen.getByTestId('documentation-uninstall-elastic_documents')).toBeInTheDocument();
      expect(
        screen.queryByTestId('documentation-install-update-elastic_documents')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('documentation-update-available-elastic_documents')
      ).not.toBeInTheDocument();
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
        expect(screen.getByTestId('documentation-actions-elastic_documents')).toBeInTheDocument();
      });

      openRowActions('elastic_documents');
      fireEvent.click(screen.getByTestId('documentation-uninstall-elastic_documents'));

      await waitFor(() => {
        expect(mockProductDocBase.installation.uninstall).toHaveBeenCalledWith({
          inferenceId: '.elser-2-elasticsearch',
          resourceType: ResourceTypes.productDoc,
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
        expect(screen.getByTestId('documentation-actions-security_labs')).toBeInTheDocument();
      });

      openRowActions('security_labs');
      fireEvent.click(screen.getByTestId('documentation-uninstall-security_labs'));

      await waitFor(() => {
        expect(mockProductDocBase.installation.uninstall).toHaveBeenCalledWith({
          inferenceId: '.elser-2-elasticsearch',
          resourceType: ResourceTypes.securityLabs,
        });
      });
    });

    it('keeps both rows in an uninstalling UI state for back-to-back uninstall clicks', async () => {
      // Make uninstalls never resolve so the mutation stays "loading"
      const never = new Promise(() => {});
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
      mockProductDocBase.installation.uninstall = jest.fn().mockReturnValue(never as any);

      renderComponent(mockProductDocBase, true);

      await waitFor(() => {
        expect(screen.getByTestId('documentation-actions-elastic_documents')).toBeInTheDocument();
        expect(screen.getByTestId('documentation-actions-security_labs')).toBeInTheDocument();
      });

      openRowActions('elastic_documents');
      openRowActions('security_labs');
      fireEvent.click(screen.getByTestId('documentation-uninstall-elastic_documents'));
      fireEvent.click(screen.getByTestId('documentation-uninstall-security_labs'));

      await waitFor(() => {
        expect(
          screen.getByTestId('documentation-uninstalling-elastic_documents')
        ).toBeInTheDocument();
        expect(screen.getByTestId('documentation-uninstalling-security_labs')).toBeInTheDocument();
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
        const actionsButton = screen.getByTestId('documentation-actions-elastic_documents');
        expect(actionsButton).toBeInTheDocument();
        expect(actionsButton).toBeDisabled();
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
        expect(screen.getByTestId('documentation-actions-elastic_documents')).toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('documentation-actions-elastic_documents'));

      // Wait a bit to ensure no call was made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockProductDocBase.installation.uninstall).not.toHaveBeenCalled();
    });
  });
});
