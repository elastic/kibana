/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import type { DeepPartial } from '@kbn/utility-types';

import { PipelinesList } from './main';
import type { PipelineTable } from './table';
import type { SectionLoading, useKibana } from '../../../shared_imports';

const mockUseKibana = jest.fn();
const mockUseCheckManageProcessorsPrivileges = jest.fn();

type MockServices = ReturnType<typeof useKibana>['services'];
type DeepPartialMockServices = DeepPartial<MockServices>;

const createMockServices = (overrides: DeepPartialMockServices = {}): DeepPartialMockServices => ({
  api: {
    useLoadPipelines: jest.fn(),
    useLoadPipeline: jest.fn(),
  },
  metric: {
    trackUiMetric: jest.fn(),
  },
  breadcrumbs: {
    setBreadcrumbs: jest.fn(),
  },
  config: {
    enableManageProcessors: false,
  },
  documentation: {
    getIngestNodeUrl: jest.fn().mockReturnValue('http://docs'),
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
      useLoadPipelines: jest.fn().mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        resendRequest: jest.fn(),
        ...loadReturn,
      }),
      useLoadPipeline: jest.fn(),
    },
  });
};

jest.mock('../../../shared_imports', () => ({
  ...jest.requireActual('../../../shared_imports'),
  useKibana: () => mockUseKibana(),
  SectionLoading: ({ children }: ComponentProps<typeof SectionLoading>) => (
    <div data-test-subj="sectionLoading">{children}</div>
  ),
}));

jest.mock('../manage_processors', () => ({
  ...jest.requireActual('../manage_processors'),
  useCheckManageProcessorsPrivileges: () => mockUseCheckManageProcessorsPrivileges(),
}));

jest.mock('./empty_list', () => ({
  ...jest.requireActual('./empty_list'),
  EmptyList: () => <div data-test-subj="emptyList">EMPTY_LIST</div>,
}));

const editName = 'p!@# name';
const cloneName = 'clone$%^name';
const unknownCreateName = 'create&*()name';

jest.mock('./table', () => ({
  ...jest.requireActual('./table'),
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
}));

jest.mock('./delete_modal', () => ({
  ...jest.requireActual('./delete_modal'),
  PipelineDeleteModal: ({ pipelinesToDelete }: { pipelinesToDelete?: unknown[] }) => (
    <div data-test-subj="pipelineDeleteModal">DELETE {pipelinesToDelete?.length ?? 0}</div>
  ),
}));

jest.mock('./pipeline_flyout', () => ({
  ...jest.requireActual('./pipeline_flyout'),
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
}));

const renderPipelinesList = (path: string, services: DeepPartialMockServices) => {
  mockUseKibana.mockReturnValue({ services });
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(
    <I18nProvider>
      <Router history={history}>
        <Routes>
          <Route exact path={'/'} component={PipelinesList} />
        </Routes>
      </Router>
    </I18nProvider>
  );
};

describe('PipelinesList section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        const resendRequest = jest.fn();
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
        const historyPushSpy = jest.spyOn(history, 'push');
        mockUseKibana.mockReturnValue({ services });

        render(
          <I18nProvider>
            <Router history={history}>
              <Routes>
                <Route exact path={'/'} component={PipelinesList} />
              </Routes>
            </Router>
          </I18nProvider>
        );

        expect(screen.getByTestId('pipelineTable')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('openFlyout'));
        expect(historyPushSpy).toHaveBeenCalled();
      });

      describe('AND WHEN the user clicks edit on a pipeline in the list', () => {
        it('SHOULD double encode pipeline name and push encoded path', () => {
          const history = createMemoryHistory({ initialEntries: ['/'] });
          const historyPushSpy = jest.spyOn(history, 'push');
          mockUseKibana.mockReturnValue({ services });

          render(
            <I18nProvider>
              <Router history={history}>
                <Routes>
                  <Route exact path={'/'} component={PipelinesList} />
                </Routes>
              </Router>
            </I18nProvider>
          );

          fireEvent.click(screen.getByTestId('editPipeline'));

          expect(historyPushSpy).toHaveBeenCalledWith(
            `/edit/${encodeURIComponent(encodeURIComponent(editName))}`
          );
        });
      });

      describe('AND WHEN the user clicks clone on a pipeline in the list', () => {
        it('SHOULD double encode cloned pipeline name and push encoded path', () => {
          const history = createMemoryHistory({ initialEntries: ['/'] });
          const historyPushSpy = jest.spyOn(history, 'push');
          jest.spyOn(console, 'warn').mockImplementation(() => {});
          mockUseKibana.mockReturnValue({ services });

          render(
            <I18nProvider>
              <Router history={history}>
                <Routes>
                  <Route exact path={'/'} component={PipelinesList} />
                </Routes>
              </Router>
            </I18nProvider>
          );

          fireEvent.click(screen.getByTestId('clonePipeline'));

          expect(historyPushSpy).toHaveBeenCalledWith(
            `/create/${encodeURIComponent(encodeURIComponent(cloneName))}`
          );
        });
      });

      describe('AND WHEN the URL contains a pipeline query param', () => {
        it('SHOULD open the PipelineFlyout on mount', () => {
          const history = createMemoryHistory({ initialEntries: ['/?pipeline=my-pipeline'] });
          mockUseKibana.mockReturnValue({ services });

          render(
            <I18nProvider>
              <Router history={history}>
                <Routes>
                  <Route exact path={'/'} component={PipelinesList} />
                </Routes>
              </Router>
            </I18nProvider>
          );

          expect(screen.getByTestId('pipelineFlyout')).toBeInTheDocument();
          expect(screen.getByText('FLYOUT my-pipeline')).toBeInTheDocument();
        });

        describe('AND WHEN the URL contains an unknown pipeline query name', () => {
          describe('AND WHEN the user clicks "Create pipeline" button', () => {
            it('SHOULD navigate to create page with prefilled single encoded name', () => {
              const history = createMemoryHistory({
                initialEntries: [`/?pipeline=${encodeURIComponent(unknownCreateName)}`],
              });
              const historyPushSpy = jest.spyOn(history, 'push');
              mockUseKibana.mockReturnValue({ services });

              render(
                <I18nProvider>
                  <Router history={history}>
                    <Routes>
                      <Route exact path={'/'} component={PipelinesList} />
                    </Routes>
                  </Router>
                </I18nProvider>
              );

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
        it('SHOULD show the Manage processors button', () => {
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

          expect(screen.getByText(/Manage processors/i)).toBeInTheDocument();
        });
      });
    });
  });
});
