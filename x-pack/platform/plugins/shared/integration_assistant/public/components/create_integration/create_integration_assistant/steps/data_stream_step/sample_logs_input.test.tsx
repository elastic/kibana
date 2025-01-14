/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../../../../mocks/test_provider';
import { parseNDJSON, parseJSONArray, SampleLogsInput } from './sample_logs_input';
import { ActionsProvider } from '../../state';
import { mockActions } from '../../mocks/state';

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

const simpleNDJSON = `{"message":"test message 1"}\n{"message":"test message 2"}`;
const multilineNDJSON = `{"message":"test message 1"}\n\n{\n  "message":\n  "test message 2"\n}\n\n`;
const splitNDJSON = simpleNDJSON.split('\n');
const complexEventsJSON = `{"events":[\n{"message":"test message 1"},\n{"message":"test message 2"}\n]}`;
const nonIdentifierLikeKeyInJSON = `{"1event":[\n{"message":"test message 1"},\n{"message":"test message 2"}\n]}`;

describe('parseNDJSON', () => {
  const content = [{ message: 'test message 1' }, { message: 'test message 2' }];
  const validNDJSONWithSpaces = `{"message":"test message 1"}
                                 {"message":"test message 2"}`;
  const singlelineArray = '[{"message":"test message 1"}, {"message":"test message 2"}]';
  const multilineArray = '[{"message":"test message 1"},\n{"message":"test message 2"}]';

  it('should parse valid NDJSON', () => {
    expect(parseNDJSON(simpleNDJSON, false)).toEqual(content);
    expect(parseNDJSON(simpleNDJSON, true)).toEqual(content);
  });

  it('should parse valid NDJSON with extra spaces in single-line mode', () => {
    expect(parseNDJSON(validNDJSONWithSpaces, false)).toEqual(content);
  });

  it('should not parse valid NDJSON with extra spaces in multiline mode', () => {
    expect(() => parseNDJSON(validNDJSONWithSpaces, true)).toThrow();
  });

  it('should not parse multiline NDJSON in single-line mode', () => {
    expect(() => parseNDJSON(multilineNDJSON, false)).toThrow();
  });

  it('should parse multiline NDJSON in multiline mode', () => {
    expect(parseNDJSON(multilineNDJSON, true)).toEqual(content);
  });

  it('should parse single-line JSON Array', () => {
    expect(parseNDJSON(singlelineArray, false)).toEqual([content]);
    expect(parseNDJSON(singlelineArray, true)).toEqual([content]);
  });

  it('should not parse a multi-line JSON Array', () => {
    expect(() => parseNDJSON(multilineArray, false)).toThrow();
    expect(() => parseNDJSON(multilineArray, true)).toThrow();
  });

  it('should parse single-line JSON with one entry', () => {
    const fileContent = '{"message":"test message 1"}';
    expect(parseNDJSON(fileContent)).toEqual([{ message: 'test message 1' }]);
  });

  it('should handle empty content', () => {
    expect(parseNDJSON('  ', false)).toEqual([]);
    expect(parseNDJSON('  ', true)).toEqual([]);
  });

  it('should handle empty lines in file content', () => {
    const fileContent = '\n\n{"message":"test message 1"}\n\n{"message":"test message 2"}\n\n';
    expect(parseNDJSON(fileContent, false)).toEqual(content);
    expect(parseNDJSON(fileContent, true)).toEqual(content);
  });
});

describe('parseJSONArray', () => {
  const content = [{ message: 'test message 1' }, { message: 'test message 2' }];
  const singlelineArray = '[{"message":"test message 1"},{"message":"test message 2"}]';
  const multilineArray = '[{"message":"test message 1"},\n{"message":"test message 2"}]';
  const multilineWithSpacesArray =
    '   [ \n\n{"message":  "test message 1"},\n{"message"   :\n\n"test message 2"}\n]\n';
  const malformedJSON = '[{"message":"test message 1"}';

  it('should parse valid JSON array', () => {
    const expected = {
      entries: content,
      pathToEntries: [],
      errorNoArrayFound: false,
    };
    expect(parseJSONArray(singlelineArray)).toEqual(expected);
    expect(parseJSONArray(multilineArray)).toEqual(expected);
    expect(parseJSONArray(multilineWithSpacesArray)).toEqual(expected);
  });

  it('should parse valid JSON object with array entries', () => {
    const expected = {
      entries: content,
      pathToEntries: ['events'],
      errorNoArrayFound: false,
    };
    expect(parseJSONArray(complexEventsJSON)).toEqual(expected);
  });

  it('should pass even if the JSON object with array entries has not an identifier-like key', () => {
    const expected = {
      entries: content,
      pathToEntries: ['1event'],
      errorNoArrayFound: false,
    };
    expect(parseJSONArray(nonIdentifierLikeKeyInJSON)).toEqual(expected);
  });

  it('should return error for JSON that does not contain an array', () => {
    const fileContent = '{"records" : {"message": "test message 1"}}';
    const expected = {
      entries: [],
      pathToEntries: [],
      errorNoArrayFound: true,
    };
    expect(parseJSONArray(fileContent)).toEqual(expected);
  });

  it('should throw an error for invalid JSON object', () => {
    expect(() => parseJSONArray(malformedJSON)).toThrow();
  });
});

describe('SampleLogsInput', () => {
  let result: RenderResult;
  let input: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    result = render(<SampleLogsInput integrationSettings={undefined} />, { wrapper });
    input = result.getByTestId('logsSampleFilePicker');
  });

  describe('when uploading a json logs sample', () => {
    const type = 'application/json';

    describe('when the file is valid json', () => {
      const logsSampleRaw = `{"message":"test message 1"},{"message":"test message 2"}`;
      beforeEach(async () => {
        await changeFile(input, new File([`[${logsSampleRaw}]`], 'test.json', { type }));
      });

      it('should set the integrationSetting correctly', () => {
        expect(mockActions.setIntegrationSettings).toBeCalledWith({
          logSamples: logsSampleRaw.split(','),
          samplesFormat: { name: 'json', json_path: [] },
        });
      });
    });

    describe('when the file is a json array under a key', () => {
      beforeEach(async () => {
        await changeFile(input, new File([complexEventsJSON], 'test.json', { type }));
      });

      it('should set the integrationSetting correctly', () => {
        expect(mockActions.setIntegrationSettings).toBeCalledWith({
          logSamples: splitNDJSON,
          samplesFormat: { name: 'json', json_path: ['events'] },
        });
      });
    });

    describe('when the file is invalid', () => {
      describe.each([
        ['["test message 1"]', 'The logs sample file contains non-object entries'],
        ['[]', 'The logs sample file is empty'],
      ])('with logs content %s', (logsSample, errorMessage) => {
        beforeEach(async () => {
          await changeFile(input, new File([logsSample], 'test.json', { type }));
        });

        it('should render error message', () => {
          expect(result.queryByText(errorMessage)).toBeInTheDocument();
        });

        it('should set the integrationSetting correctly', () => {
          expect(mockActions.setIntegrationSettings).toBeCalledWith({
            logSamples: undefined,
            samplesFormat: undefined,
          });
        });
      });
    });
  });

  describe('when setting a ndjson logs sample', () => {
    const type = 'application/x-ndjson';

    describe('when the file is valid ndjson', () => {
      beforeEach(async () => {
        await changeFile(input, new File([simpleNDJSON], 'test.json', { type }));
      });

      it('should set the integrationSetting correctly', () => {
        expect(mockActions.setIntegrationSettings).toBeCalledWith({
          logSamples: splitNDJSON,
          samplesFormat: { name: 'ndjson', multiline: false },
        });
      });
    });

    describe('when the file is a an ndjson with a single record', () => {
      beforeEach(async () => {
        await changeFile(input, new File([multilineNDJSON.split('\n')[0]], 'test.json', { type }));
      });

      it('should set the integrationSetting correctly', () => {
        expect(mockActions.setIntegrationSettings).toBeCalledWith({
          logSamples: [splitNDJSON[0]],
          samplesFormat: { name: 'ndjson', multiline: false },
        });
      });
    });

    describe('when the file is multiline ndjson', () => {
      beforeEach(async () => {
        await changeFile(input, new File([multilineNDJSON], 'test.json', { type }));
      });

      it('should set the integrationSetting correctly', () => {
        expect(mockActions.setIntegrationSettings).toBeCalledWith({
          logSamples: splitNDJSON,
          samplesFormat: { name: 'ndjson', multiline: true },
        });
      });
    });

    describe('when the file is invalid', () => {
      describe.each([
        ['"test message 1"', 'The logs sample file contains non-object entries'],
        ['', 'The logs sample file is empty'],
      ])('with logs content %s', (logsSample, errorMessage) => {
        beforeEach(async () => {
          await changeFile(input, new File([logsSample], 'test.json', { type }));
        });

        it('should render error message', () => {
          expect(result.queryByText(errorMessage)).toBeInTheDocument();
        });

        it('should set the integrationSetting correctly', () => {
          expect(mockActions.setIntegrationSettings).toBeCalledWith({
            logSamples: undefined,
            samplesFormat: undefined,
          });
        });
      });
    });
  });

  describe('when the file is too large', () => {
    const type = 'text/plain';
    let jsonParseSpy: jest.SpyInstance;

    beforeEach(async () => {
      // Simulate large log content that would cause a RangeError
      jsonParseSpy = jest.spyOn(JSON, 'parse').mockImplementation(() => {
        throw new RangeError();
      });

      await changeFile(input, new File(['...'], 'test.json', { type }));
    });

    afterAll(() => {
      // Restore the original implementation after all tests
      jsonParseSpy.mockRestore();
    });

    it('should raise an appropriate error', () => {
      expect(result.queryByText('This logs sample file is too large to parse')).toBeInTheDocument();
    });
  });

  describe('when the file is neither a valid json nor ndjson', () => {
    const plainTextFile = 'test message 1\ntest message 2';
    const type = 'text/plain';

    beforeEach(async () => {
      await changeFile(input, new File([plainTextFile], 'test.txt', { type }));
    });

    it('should set the integrationSetting correctly', () => {
      expect(mockActions.setIntegrationSettings).toBeCalledWith({
        logSamples: plainTextFile.split('\n'),
        samplesFormat: undefined,
      });
    });
  });

  describe('when the file reader fails', () => {
    const mockedMessage = 'Mocked error';
    let myFileReader: FileReader;
    let fileReaderSpy: jest.SpyInstance;

    beforeEach(async () => {
      myFileReader = new FileReader();
      fileReaderSpy = jest.spyOn(global, 'FileReader').mockImplementation(() => myFileReader);

      // We need to mock the error property
      Object.defineProperty(myFileReader, 'error', {
        value: new Error(mockedMessage),
        writable: false,
      });

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

    it('should set the error message accordingly', () => {
      expect(
        result.queryByText(`An error occurred when reading logs sample: ${mockedMessage}`)
      ).toBeInTheDocument();
    });
  });
});
