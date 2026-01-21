/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@kbn/code-editor-mock/jest_helper';

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';

import { API_BASE_PATH } from '../../common/constants';
import { PipelinesCreateFromCsv } from '../../public/application/sections/pipelines_create_from_csv';
import { getCreateFromCsvPath, ROUTES } from '../../public/application/services/navigation';

import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    EuiFilePicker: (props: {
      'data-test-subj'?: string;
      onChange: (files: FileList | null) => void;
    }) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockFilePicker'}
        type="file"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onChange(e.target.files)}
      />
    ),
  };
});

describe('<PipelinesCreateFromCsv />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPipelinesCreateFromCsv = async () => {
    const history = createMemoryHistory({
      initialEntries: [getCreateFromCsvPath()],
    });

    const Wrapped = WithAppDependencies(PipelinesCreateFromCsv, httpSetup);
    render(
      <Router history={history}>
        <Route path={ROUTES.createFromCsv} component={Wrapped} />
      </Router>
    );

    await screen.findByTestId('pageTitle');
  };

  describe('on component mount', () => {
    test('should render the correct page header and documentation link', async () => {
      await renderPipelinesCreateFromCsv();

      expect(screen.getByTestId('pageTitle')).toHaveTextContent('Create pipeline from CSV');
      expect(screen.getByTestId('documentationLink')).toHaveTextContent('CSV to pipeline docs');
    });

    describe('form validation', () => {
      test('should prevent form submission if file for upload is missing', async () => {
        await renderPipelinesCreateFromCsv();

        expect(screen.getByTestId('processFileButton')).toBeDisabled();

        fireEvent.change(screen.getByTestId('csvFilePicker'), {
          target: { files: [new File(['x'], 'foo.csv')] },
        });
        await waitFor(() => expect(screen.getByTestId('processFileButton')).not.toBeDisabled());
      });
    });

    describe('form submission', () => {
      const fileContent = 'Mock file content';

      const mockFile = {
        name: 'foo.csv',
        text: () => Promise.resolve(fileContent),
        size: fileContent.length,
      } as File;

      const parsedCsv = {
        processors: [
          {
            set: {
              field: 'foo',
              if: 'ctx.bar != null',
              value: '{{bar}}',
            },
          },
        ],
      };

      test('should parse csv from file upload', async () => {
        httpRequestsMockHelpers.setParseCsvResponse(parsedCsv, undefined);
        await renderPipelinesCreateFromCsv();

        fireEvent.change(screen.getByTestId('csvFilePicker'), { target: { files: [mockFile] } });
        await waitFor(() => expect(screen.getByTestId('processFileButton')).not.toBeDisabled());

        const postCallsBefore = httpSetup.post.mock.calls.length;
        fireEvent.click(screen.getByTestId('processFileButton'));

        await waitFor(() =>
          expect(httpSetup.post.mock.calls.length).toBeGreaterThan(postCallsBefore)
        );
        const parseRequest = httpSetup.post.mock.results[postCallsBefore]?.value as
          | Promise<unknown>
          | undefined;
        expect(parseRequest).toBeDefined();
        await waitFor(async () => {
          await parseRequest;
        });

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/parse_csv`,
          expect.objectContaining({
            body: JSON.stringify({
              file: fileContent,
              copyAction: 'copy',
            }),
          })
        );

        const mappings = await screen.findByTestId('pipelineMappingsJSONEditor');
        const editor = within(mappings).getByTestId('mockedCodeEditor');
        const currentValue = editor.getAttribute('data-currentvalue') ?? '';
        expect(JSON.parse(currentValue)).toEqual(parsedCsv);
      });

      test('should render an error message if error mapping pipeline', async () => {
        const errorTitle = 'title';
        const errorDetails = 'helpful description';

        const error = {
          statusCode: 400,
          error: 'Bad Request',
          message: `${errorTitle}:${errorDetails}`,
        };

        httpRequestsMockHelpers.setParseCsvResponse(undefined, error);

        await renderPipelinesCreateFromCsv();
        fireEvent.change(screen.getByTestId('csvFilePicker'), { target: { files: [mockFile] } });
        await waitFor(() => expect(screen.getByTestId('processFileButton')).not.toBeDisabled());
        fireEvent.click(screen.getByTestId('processFileButton'));

        const callout = await screen.findByTestId('errorCallout');
        expect(callout).toHaveTextContent(errorTitle);
        expect(callout).toHaveTextContent(errorDetails);
      });

      describe('results', () => {
        test('result buttons', async () => {
          httpRequestsMockHelpers.setParseCsvResponse(parsedCsv, undefined);
          await renderPipelinesCreateFromCsv();

          fireEvent.change(screen.getByTestId('csvFilePicker'), { target: { files: [mockFile] } });
          await waitFor(() => expect(screen.getByTestId('processFileButton')).not.toBeDisabled());
          fireEvent.click(screen.getByTestId('processFileButton'));

          expect(await screen.findByTestId('pipelineMappingsJSONEditor')).toBeInTheDocument();

          expect(screen.getByTestId('continueToCreate')).toHaveTextContent(
            'Continue to create pipeline'
          );
          expect(screen.getByTestId('copyToClipboard')).toHaveTextContent('Copy JSON');
          expect(screen.getByTestId('downloadJson')).toHaveTextContent('Download JSON');
        });
      });
    });
  });
});
