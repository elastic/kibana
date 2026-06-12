/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import type { DeepPartial } from '@kbn/utility-types';

import { PipelinesCreate } from './pipelines_create';
import type { useKibana } from '../../../shared_imports';

const mockUseKibana = jest.fn();

type MockServices = ReturnType<typeof useKibana>['services'];
type DeepPartialMockServices = DeepPartial<MockServices>;

const createMockServices = (overrides: DeepPartialMockServices = {}): DeepPartialMockServices => ({
  api: {
    createPipeline: jest.fn(),
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

jest.mock('../../../shared_imports', () => ({
  ...jest.requireActual('../../../shared_imports'),
  useKibana: () => mockUseKibana(),
}));

// Mock the PipelineForm to easily assert props passed from PipelinesCreate
jest.mock('../../components', () => ({
  PipelineForm: (props: { defaultValue?: { name: string }; canEditName: boolean }) => (
    <div data-test-subj="pipelineForm">
      <div data-test-subj="formDefaultValue">
        {props.defaultValue ? props.defaultValue.name : 'no-default'}
      </div>
      <div data-test-subj="canEditName">{String(props.canEditName)}</div>
    </div>
  ),
}));

const renderWithPath = (path: string, services: DeepPartialMockServices) => {
  mockUseKibana.mockReturnValue({ services });
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(
    <I18nProvider>
      <Router history={history}>
        <Routes>
          <Route exact path={'/create'} component={PipelinesCreate} />
        </Routes>
      </Router>
    </I18nProvider>
  );
};

describe('PipelinesCreate section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WHEN mounting the PipelinesCreate route', () => {
    describe('AND no name param is provided', () => {
      it('SHOULD render the form and allow editing the name', () => {
        const services = createMockServices();

        renderWithPath('/create', services);

        expect(screen.getByTestId('pipelineForm')).toBeInTheDocument();
        expect(screen.getByTestId('formDefaultValue').textContent).toBe('no-default');
        expect(screen.getByTestId('canEditName').textContent).toBe('true');
      });
    });

    describe('AND the URL contains a name query param', () => {
      it('SHOULD prepopulate the form defaultValue.name and disallow editing the name', () => {
        const services = createMockServices();

        renderWithPath('/create?name=my-pipeline', services);

        expect(screen.getByTestId('pipelineForm')).toBeInTheDocument();
        expect(screen.getByTestId('formDefaultValue').textContent).toBe('my-pipeline');
        expect(screen.getByTestId('canEditName').textContent).toBe('false');
      });
    });

    describe('AND pipeline name contains special characters', () => {
      it('SHOULD correctly decode the name and pass it to the form', () => {
        const services = createMockServices();
        // we omit . and * characters which are handled on input validation level
        // see https://github.com/elastic/kibana/pull/174830
        const pipelineName = 'my-p!@#$%^&()_+|}{":?><./;\'[]\\=-`~ipeline';
        const encodedPipelineName = encodeURIComponent(pipelineName);

        // route param with special symbols will be encoded; so we provide encoded form in path
        renderWithPath(`/create?name=${encodedPipelineName}`, services);

        expect(screen.getByTestId('pipelineForm')).toBeInTheDocument();
        expect(screen.getByTestId('formDefaultValue').textContent).toBe(pipelineName);
      });
    });
  });
});
