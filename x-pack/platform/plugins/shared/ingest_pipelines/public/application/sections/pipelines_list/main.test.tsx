/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { ComponentProps } from 'react';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import type { DeepPartial } from '@kbn/utility-types';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';

import { PipelinesList } from './main';
import type { PipelineTable } from './table';
import type { SectionLoading, useKibana } from '../../../shared_imports';

const mockUseKibana = vi.fn();
const mockUseCheckManageProcessorsPrivileges = vi.fn();

type MockServices = ReturnType<typeof useKibana>['services'];
type DeepPartialMockServices = DeepPartial<MockServices>;

const createMockServices = (overrides: DeepPartialMockServices = {}): DeepPartialMockServices => ({
  api: {
    useLoadPipelines: vi.fn(),
    useLoadPipeline: vi.fn(),
  },
  metric: {
    trackUiMetric: vi.fn(),
  },
  breadcrumbs: {
    setBreadcrumbs: vi.fn(),
  },
  config: {
    enableManageProcessors: false,
  },
  documentation: {
    getIngestNodeUrl: vi.fn().mockReturnValue('http://docs'),
  },
  consolePlugin: undefined,
  ...overrides,
});

const createServicesWithLoadPipelines = (
  loadReturn: Partial<ReturnType<MockServices['api']['useLoadPipelines']>>,
  overrides: DeepPartialMockServices = {}
) => {
  return createMockServices({
    ...overrides,
    api: {
      useLoadPipelines: vi.fn().mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        resendRequest: vi.fn(),
        ...loadReturn,
      }),
      useLoadPipeline: vi.fn(),
    },
  });
};

vi.mock('../../../shared_imports', async () => {
      const mocked = {
      ...(await vi.importActual('../../../shared_imports')),
      useKibana: () => mockUseKibana(),
      SectionLoading: ({ children }: ComponentProps<typeof SectionLoading>) => (
        <div data-test-subj="sectionLoading">{children}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../manage_processors', async () => {
      const mocked = {
      ...(await vi.importActual('../manage_processors')),
      useCheckManageProcessorsPrivileges: () => mockUseCheckManageProcessorsPrivileges(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./empty_list', async () => {
      const mocked = {
      ...(await vi.importActual('./empty_list')),
      EmptyList: () => <div data-test-subj="emptyList">EMPTY_LIST</div>,
    };
      return { ...mocked, default: mocked };
    });

const editName = 'p!@# name';
const cloneName = 'clone$%^name';
const unknownCreateName = 'create&*()name';

vi.mock('./table', async () => {
      const mocked = {
      ...(await vi.importActual('./table')),
      PipelineTable: (props: ComponentProps<typeof PipelineTable>) => (
        <div data-test-subj="pipelineTable">
          PIPELINE_TABLE
          <button
            data-test-subj="openFlyout"
            onClick={() => {
              props.openFlyout('from-table');
            }}
          >
            openFlyout
          </button>
          <button
            data-test-subj="editPipeline"
            onClick={() => {
              props.onEditPipelineClick(editName);
            }}
          >
            edit
          </button>
          <button
            data-test-subj="clonePipeline"
            onClick={() => {
              props.onClonePipelineClick(cloneName);
            }}
          >
            clone
          </button>
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./delete_modal', async () => {
      const mocked = {
      ...(await vi.importActual('./delete_modal')),
      PipelineDeleteModal: ({ pipelinesToDelete }: { pipelinesToDelete?: unknown[] }) => (
        <div data-test-subj="pipelineDeleteModal">DELETE {pipelinesToDelete?.length ?? 0}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./pipeline_flyout', async () => {
      const mocked = {
      ...(await vi.importActual('./pipeline_flyout')),
      PipelineFlyout: (props: { ingestPipeline: string; onCreateClick: (name: string) => void }) => (
        <div data-test-subj="pipelineFlyout">
          <h1>FLYOUT {props.ingestPipeline}</h1>
          <button
            data-test-subj="createUnknownPipeline"
            onClick={() => {
              props.onCreateClick(props.ingestPipeline);
            }}
          >
            Create pipeline
          </button>
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

const renderList = (
  history: ReturnType<typeof createMemoryHistory>,
  services: DeepPartialMockServices
) => {
  mockUseKibana.mockReturnValue({ services });
  return render(
    <MockAppHeaderProvider>
      <I18nProvider>
        <Router history={history}>
          <Routes>
            <Route exact path={'/'} component={PipelinesList} />
          </Routes>
        </Router>
      </I18nProvider>
    </MockAppHeaderProvider>
  );
};

const renderPipelinesList = (path: string, services: DeepPartialMockServices) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  return renderList(history, services);
};

describe('PipelinesList section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WHEN mounting the PipelinesList route', () => {
    describe('AND the API reports loading', () => {
      it('SHOULD show the SectionLoading with the loading message', () => {
        const services = createServicesWithLoadPipelines({
          isLoading: true,
        });

        renderPipelinesList('/', services);

        expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
        expect(services.metric!.trackUiMetric).toHaveBeenCalled();
        expect(services.breadcrumbs!.setBreadcrumbs).toHaveBeenCalledWith('home');
      });
    });

    describe('AND the API reports an error', () => {
      it('SHOULD render the error prompt and call resendRequest when clicking Try again', () => {
        const resendRequest = vi.fn();
        const services = createServicesWithLoadPipelines({
          error: {
            message: 'boom',
            statusCode: 500,
            error: 'Internal Server Error',
          },
          resendRequest,
        });

        renderPipelinesList('/', services);

        expect(screen.getByText('boom')).toBeInTheDocument();

        const tryAgainButton = screen.getByText('Try again');
        fireEvent.click(tryAgainButton);
        expect(resendRequest).toHaveBeenCalled();
      });
    });

    describe('AND the API returns an empty list', () => {
      it('SHOULD render the EmptyList component', () => {
        const services = createServicesWithLoadPipelines({
          data: [],
        });

        renderPipelinesList('/', services);

        expect(screen.getByTestId('emptyList')).toBeInTheDocument();
      });
    });

    describe('AND pipelines exist', () => {
      const mockPipelines = [
        { name: 'p1', description: '', processors: [], on_failure: [] },
        { name: 'p2', description: '', processors: [], on_failure: [] },
      ];

      let services: DeepPartialMockServices;

      beforeEach(() => {
        services = createServicesWithLoadPipelines({
          data: mockPipelines,
        });
      });

      it('SHOULD render the PipelineTable and allow opening the flyout via table callback', () => {
        const history = createMemoryHistory({ initialEntries: ['/'] });
        const historyPushSpy = vi.spyOn(history, 'push');
        renderList(history, services);

        expect(screen.getByTestId('pipelineTable')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('openFlyout'));
        expect(historyPushSpy).toHaveBeenCalled();
      });

      describe('AND WHEN the user clicks edit on a pipeline in the list', () => {
        it('SHOULD double encode pipeline name and push encoded path', () => {
          const history = createMemoryHistory({ initialEntries: ['/'] });
          const historyPushSpy = vi.spyOn(history, 'push');
          renderList(history, services);

          fireEvent.click(screen.getByTestId('editPipeline'));

          expect(historyPushSpy).toHaveBeenCalledWith(
            `/edit/${encodeURIComponent(encodeURIComponent(editName))}`
          );
        });
      });

      describe('AND WHEN the user clicks clone on a pipeline in the list', () => {
        it('SHOULD double encode cloned pipeline name and push encoded path', () => {
          const history = createMemoryHistory({ initialEntries: ['/'] });
          const historyPushSpy = vi.spyOn(history, 'push');
          vi.spyOn(console, 'warn').mockImplementation(() => {});
          renderList(history, services);

          fireEvent.click(screen.getByTestId('clonePipeline'));

          expect(historyPushSpy).toHaveBeenCalledWith(
            `/create/${encodeURIComponent(encodeURIComponent(cloneName))}`
          );
        });
      });

      describe('AND WHEN the URL contains a pipeline query param', () => {
        it('SHOULD open the PipelineFlyout on mount', () => {
          const history = createMemoryHistory({ initialEntries: ['/?pipeline=my-pipeline'] });
          renderList(history, services);

          expect(screen.getByTestId('pipelineFlyout')).toBeInTheDocument();
          expect(screen.getByText('FLYOUT my-pipeline')).toBeInTheDocument();
        });

        describe('AND WHEN the URL contains an unknown pipeline query name', () => {
          describe('AND WHEN the user clicks "Create pipeline" button', () => {
            it('SHOULD navigate to create page with prefilled single encoded name', () => {
              const history = createMemoryHistory({
                initialEntries: [`/?pipeline=${encodeURIComponent(unknownCreateName)}`],
              });
              const historyPushSpy = vi.spyOn(history, 'push');
              renderList(history, services);

              expect(screen.getByTestId('pipelineFlyout')).toBeInTheDocument();
              expect(screen.getByText(`FLYOUT ${unknownCreateName}`)).toBeInTheDocument();

              fireEvent.click(screen.getByTestId('createUnknownPipeline'));

              expect(historyPushSpy).toHaveBeenCalledWith(
                `/create?name=${encodeURIComponent(unknownCreateName)}`
              );
            });
          });
        });
      });

      describe('AND WHEN manage processors is enabled and user has privileges', () => {
        it('SHOULD show the Manage processors button', async () => {
          const servicesWithManageProcessors = createServicesWithLoadPipelines(
            {
              data: [{ name: 'p1', description: '', processors: [], on_failure: [] }],
            },
            {
              config: { enableManageProcessors: true },
            }
          );

          mockUseCheckManageProcessorsPrivileges.mockReturnValue(true);

          renderPipelinesList('/', servicesWithManageProcessors);

          await openAppMenuOverflow();
          expect(screen.getByTestId('manageProcessorsLink')).toBeInTheDocument();
        });
      });
    });
  });
});
