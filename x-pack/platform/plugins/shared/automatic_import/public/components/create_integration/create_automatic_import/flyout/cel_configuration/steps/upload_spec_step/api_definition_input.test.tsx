/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../../../../../../mocks/test_provider';
import { ApiDefinitionInput } from './api_definition_input';

import { ActionsProvider } from '../../../../state';
import { mockActions } from '../../../../mocks/state';
import Oas from 'oas';

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

const changeFile = async (input: HTMLElement, file: File) => {
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(input).toHaveAttribute('data-loading', 'true'));
    await waitFor(() => expect(input).toHaveAttribute('data-loading', 'false'));
  });
};

const simpleOpenApiJson = `{"openapi":"3.0.0","info":{"title":"Sample API"},"paths":{"/users":{"get":{"summary":"Returns a list of users.","description":"Optional extended description in CommonMark or HTML.","responses":{"200":{"description":"A JSON array of user names","content":{"application/json":{"schema":{"type":"array","items":{"type":"string"}}}}}}}}}}`;
const simpleOpenApiYaml = `openapi: 3.0.0
info:
  title: Sample API
paths:
  /users:
    get:
      summary: Returns a list of users.
      description: Optional extended description in CommonMark or HTML.
      responses:
        "200": # status code
          description: A JSON array of user names
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string`;

describe('SampleLogsInput', () => {
  let result: RenderResult;
  let input: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    result = render(
      <ApiDefinitionInput
        integrationSettings={undefined}
        showValidation={false}
        isGenerating={false}
        onModifySpecFile={() => {}}
      />,
      { wrapper }
    );
    input = result.getByTestId('apiDefinitionFilePicker');
  });

  describe('when uploading a json file', () => {
    const type = 'application/json';

    describe('when the file is a valid json spec file', () => {
      beforeEach(async () => {
        await changeFile(input, new File([`${simpleOpenApiJson}`], 'test.json', { type }));
      });

      it('should set the integrationSetting correctly', () => {
        expect(mockActions.setIntegrationSettings).toBeCalledWith({
          apiSpec: expect.any(Oas),
          apiSpecFileName: 'test.json',
        });
      });
    });

    describe('when the file is invalid', () => {
      const otherJson = `{"events":[\n{"message":"test message 1"},\n{"message":"test message 2"}\n]}`;
      beforeEach(async () => {
        await changeFile(input, new File([otherJson], 'test.json', { type }));
      });

      it('should render invalid inputs', () => {
        expect(input).toHaveAttribute('aria-invalid');
      });

      it('should set the integrationSetting correctly', () => {
        expect(mockActions.setIntegrationSettings).toBeCalledWith({
          apiSpec: undefined,
          apiSpecFileName: undefined,
        });
      });
    });

    describe('when uploading a yaml spec file', () => {
      describe('when the file is a valid yaml spec file', () => {
        beforeEach(async () => {
          await changeFile(
            input,
            new File([`${simpleOpenApiYaml}`], 'test.yaml', { type: 'text/yaml' })
          );
        });

        it('should set the integrationSetting correctly', () => {
          expect(mockActions.setIntegrationSettings).toBeCalledWith({
            apiSpec: expect.any(Oas),
            apiSpecFileName: 'test.yaml',
          });
        });
      });

      describe('when the file is invalid', () => {
        const otherYaml = `foo: 1
bar: 2`;
        beforeEach(async () => {
          await changeFile(input, new File([otherYaml], 'test.json', { type }));
        });

        it('should render invalid inputs', () => {
          expect(input).toHaveAttribute('aria-invalid');
        });

        it('should set the integrationSetting correctly', () => {
          expect(mockActions.setIntegrationSettings).toBeCalledWith({
            apiSpec: undefined,
            apiSpecFileName: undefined,
          });
        });
      });
    });

    describe('when the file is too large', () => {
      let jsonParseSpy: jest.SpyInstance;

      beforeEach(async () => {
        // Simulate large content that would cause a RangeError
        jsonParseSpy = jest.spyOn(JSON, 'parse').mockImplementation(() => {
          throw new RangeError();
        });

        await changeFile(input, new File(['...'], 'test.json', { type: 'text/plain' }));
      });

      afterAll(() => {
        // Restore the original implementation after all tests
        jsonParseSpy.mockRestore();
      });

      it('should display invalid', () => {
        expect(input).toHaveAttribute('aria-invalid');
      });
    });

    describe('when the file is neither a valid json nor yaml', () => {
      const plainTextFile = 'test message 1\ntest message 2';

      beforeEach(async () => {
        await changeFile(input, new File([plainTextFile], 'test.txt', { type: 'text/plain' }));
      });

      it('should render invalid inputs', () => {
        expect(input).toHaveAttribute('aria-invalid');
      });

      it('should set the integrationSetting correctly', () => {
        expect(mockActions.setIntegrationSettings).toBeCalledWith({
          apiSpec: undefined,
          apiSpecFileName: undefined,
        });
      });
    });

    describe('when the file reader fails', () => {
      let myFileReader: FileReader;
      let fileReaderSpy: jest.SpyInstance;

      beforeEach(async () => {
        myFileReader = new FileReader();
        fileReaderSpy = jest.spyOn(global, 'FileReader').mockImplementation(() => myFileReader);

        jest.spyOn(myFileReader, 'readAsText').mockImplementation(() => {
          const errorEvent = new ProgressEvent('error');
          myFileReader.dispatchEvent(errorEvent);
        });

        const file = new File([`...`], 'test.json', { type: 'application/json' });
        act(() => {
          fireEvent.change(input, { target: { files: [file] } });
        });
      });

      afterEach(() => {
        fileReaderSpy.mockRestore();
      });

      it('should set input invalid', () => {
        expect(input).toHaveAttribute('aria-invalid');
      });
    });
  });
});
