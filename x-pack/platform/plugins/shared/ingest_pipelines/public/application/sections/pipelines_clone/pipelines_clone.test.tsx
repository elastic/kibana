/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComponentProps } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import type { DeepPartial } from '@kbn/utility-types';

import type { PipelinesCreate } from '../pipelines_create';
import { PipelinesClone } from './pipelines_clone';
import type { useKibana } from '../../../shared_imports';
import { createMemoryHistory } from 'history';

const mockUseKibana = jest.fn();

jest.mock('../../../shared_imports', () => ({
  ...jest.requireActual('../../../shared_imports'),
  useKibana: () => mockUseKibana(),
}));

jest.mock('../pipelines_create', () => ({
  ...jest.requireActual('../pipelines_create'),
  PipelinesCreate: (props: ComponentProps<typeof PipelinesCreate>) => (
    <div data-test-subj="pipelinesCreate">
      <h1>PIPELINES_CREATE</h1>
      <div data-test-subj="sourcePipelineName">
        {props.sourcePipeline ? props.sourcePipeline.name : 'no-source'}
      </div>
    </div>
  ),
}));

type MockServices = ReturnType<typeof useKibana>['services'];
type DeepPartialMockServices = DeepPartial<MockServices>;

const createMockServices = (overrides: DeepPartialMockServices = {}): DeepPartialMockServices => ({
  api: {
    useLoadPipeline: jest.fn(),
  },
  notifications: {
    toasts: {
      addError: jest.fn(),
    },
  },
  ...overrides,
});

const createServicesWithLoad = (
  loadReturn: Partial<ReturnType<MockServices['api']['useLoadPipeline']>>,
  overrides: DeepPartialMockServices = {}
) => {
  return createMockServices({
    ...overrides,
    api: {
      useLoadPipeline: jest.fn().mockReturnValue({
        resendRequest: jest.fn(),
        error: null,
        data: undefined,
        isLoading: false,
        isInitialRequest: false,
        ...loadReturn,
      }),
    },
  });
};

const originalLocation = window.location;

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
  return render(
    <I18nProvider>
      <Router history={createMemoryHistory({ initialEntries: [initialRouteEntry] })}>
        <Routes>
          <Route exact path={'/create/:sourceName'} component={PipelinesClone} />
        </Routes>
      </Router>
    </I18nProvider>
  );
};

describe('PipelinesClone section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  describe('WHEN mounting the PipelinesClone route', () => {
    describe('AND the initial request is in flight', () => {
      it('SHOULD show SectionLoading', () => {
        const services = createServicesWithLoad({
          isLoading: true,
          isInitialRequest: true,
        });

        renderWithRoute('/create/source-name', services);

        expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
      });
    });

    describe('AND the load pipeline fails after request', () => {
      it('SHOULD show toast error and still render create form', () => {
        const mockAddError = jest.fn();
        const services = createServicesWithLoad(
          {
            error: {
              statusCode: 404,
              message: 'Not Found',
              error: 'Not Found',
            },
          },
          { notifications: { toasts: { addError: mockAddError } } }
        );

        renderWithRoute('/create/source-404', services);

        expect(screen.getByTestId('pipelinesCreate')).toBeInTheDocument();
        expect(mockAddError).toHaveBeenCalled();
      });
    });

    describe('AND the load returns no data and no error after request', () => {
      it('SHOULD render create form without calling toasts', () => {
        const mockAddError = jest.fn();
        const services = createServicesWithLoad(
          {},
          { notifications: { toasts: { addError: mockAddError } } }
        );

        renderWithRoute('/create/source-missing', services);

        expect(screen.getByTestId('pipelinesCreate')).toBeInTheDocument();
        expect(mockAddError).not.toHaveBeenCalled();
      });
    });

    describe('AND the load returns a pipeline', () => {
      it('SHOULD pass loaded pipeline to PipelinesCreate with "-copy" suffix', () => {
        const pipeline = {
          id: 'p1',
          name: 'orig-pipeline',
          description: '',
          processors: [],
          on_failure: [],
        };
        const services = createServicesWithLoad({
          data: pipeline,
        });

        renderWithRoute('/create/orig-pipeline', services);

        expect(screen.getByTestId('pipelinesCreate')).toBeInTheDocument();
        expect(screen.getByTestId('sourcePipelineName').textContent).toBe('orig-pipeline-copy');
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
        const initialRoute = '/create/' + encodeURIComponent(pipelineName);
        const pipeline = {
          id: 'p1',
          name: pipelineName,
          description: '',
          processors: [],
          on_failure: [],
        };
        const services = createServicesWithLoad({ data: pipeline });

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
