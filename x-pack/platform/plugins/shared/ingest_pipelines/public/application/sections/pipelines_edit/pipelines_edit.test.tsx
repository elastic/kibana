/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import type { DeepPartial } from '@kbn/utility-types';

import { PipelinesEdit } from './pipelines_edit';
import type { useKibana } from '../../../shared_imports';
import { createMemoryHistory } from 'history';

const mockUseKibana = jest.fn();

type MockServices = ReturnType<typeof useKibana>['services'];
type DeepPartialMockServices = DeepPartial<MockServices>;

const createMockServices = (overrides: DeepPartialMockServices = {}): DeepPartialMockServices => ({
  api: {
    useLoadPipeline: jest.fn(),
    updatePipeline: jest.fn(),
  },
  breadcrumbs: {
    setBreadcrumbs: jest.fn(),
  },
  documentation: {
    getCreatePipelineUrl: jest.fn().mockReturnValue('http://docs'),
  },
  consolePlugin: undefined,
  ...overrides,
});

const createServicesWithLoadPipeline = (
  loadReturn: Partial<ReturnType<MockServices['api']['useLoadPipeline']>>,
  overrides: DeepPartialMockServices = {}
) => {
  return createMockServices({
    ...overrides,
    api: {
      useLoadPipeline: jest.fn().mockReturnValue({
        error: null,
        data: undefined,
        isLoading: false,
        resendRequest: jest.fn(),
        ...loadReturn,
      }),
      updatePipeline: jest.fn(),
    },
  });
};

jest.mock('../../../shared_imports', () => ({
  ...jest.requireActual('../../../shared_imports'),
  useKibana: () => mockUseKibana(),
  SectionLoading: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="sectionLoading">{children}</div>
  ),
}));

jest.mock('../../components', () => ({
  PipelineForm: (props: { defaultValue?: { name: string }; isEditing: boolean }) => (
    <div data-test-subj="pipelineForm">
      <div data-test-subj="formDefaultValue">
        {props.defaultValue ? props.defaultValue.name : 'no-default'}
      </div>
      <div data-test-subj="isEditing">{String(props.isEditing)}</div>
    </div>
  ),
}));

const renderWithRoute = (initialRouteEntry: string, services: DeepPartialMockServices) => {
  // window location is being used in normalizePipelineNameFromParams
  // but it's not set when rendering via MemoryRouter
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      pathname: initialRouteEntry,
    },
  });

  mockUseKibana.mockReturnValue({ services });
  const history = createMemoryHistory({ initialEntries: [initialRouteEntry] });
  return render(
    <I18nProvider>
      <Router history={history}>
        <Routes>
          <Route exact path={'/edit/:name'} component={PipelinesEdit} />
        </Routes>
      </Router>
    </I18nProvider>
  );
};

const originalLocation = window.location;

describe('PipelinesEdit section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  describe('WHEN mounting the PipelinesEdit route', () => {
    describe('AND the initial request is in flight', () => {
      it('SHOULD show SectionLoading', () => {
        const services = createServicesWithLoadPipeline({
          isLoading: true,
        });

        renderWithRoute('/edit/source-name', services);

        expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
      });
    });

    describe('AND the load returns an error', () => {
      it('SHOULD render the error prompt containing decoded pipeline name', () => {
        const decoded = 'decoded-pipeline+';
        const services = createServicesWithLoadPipeline({
          error: {
            message: 'not found',
            statusCode: 404,
            error: 'Not Found',
          },
        });

        // route param will be encoded; provide encoded form in path
        const encoded = encodeURIComponent(decoded);
        renderWithRoute(`/edit/${encoded}`, services);

        // The component renders an EmptyPrompt with text "Unable to load ''{name}''"
        expect(screen.getByText(new RegExp(`Unable to load.*${decoded}`))).toBeInTheDocument();
      });
    });

    describe('AND the load returns a pipeline', () => {
      it('SHOULD pass loaded pipeline to PipelineForm and set isEditing=true', () => {
        const pipeline = {
          id: 'p1',
          name: 'orig-pipeline',
          description: '',
          processors: [],
          on_failure: [],
        };
        const services = createServicesWithLoadPipeline({
          data: pipeline,
        });

        renderWithRoute('/edit/orig-pipeline', services);

        expect(screen.getByTestId('pipelineForm')).toBeInTheDocument();
        expect(screen.getByTestId('formDefaultValue').textContent).toBe('orig-pipeline');
        expect(screen.getByTestId('isEditing').textContent).toBe('true');
      });
    });

    describe('AND pipeline name contains special characters', () => {
      it('SHOULD properly decode the name', () => {
        const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {}); // to suppress history v4 warning
        // we omit . and * characters which are handled on input validation level
        // see https://github.com/elastic/kibana/pull/174830
        const pipelineName = 'my-p!@#$%^&()_+|}{":?><./;\'[]\\=-`~ipeline';
        // single encoding assumes that it's a reloaded page or opened in a new tab
        // from a previously transitioned double encoded URL
        // See https://github.com/elastic/kibana/issues/234500
        const initialRoute = '/edit/' + encodeURIComponent(pipelineName);
        const pipeline = {
          id: 'p1',
          name: pipelineName,
          description: '',
          processors: [],
          on_failure: [],
        };
        const services = createServicesWithLoadPipeline({ data: pipeline });

        renderWithRoute(initialRoute, services);

        const useLoadPipelineMock = services.api?.useLoadPipeline as jest.Mock;

        const firstCallArg = useLoadPipelineMock.mock.calls[0][0];

        expect(firstCallArg).not.toBe(decodeURI(encodeURIComponent(pipelineName)));
        expect(firstCallArg).toBe(pipelineName);
        consoleWarn.mockRestore();
      });
    });
  });
});
