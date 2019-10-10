/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fileHandler, FILE_BUFFER } from './file_parser';
jest.mock('./pattern_reader', () => ({}));

describe('parse file', () => {
  const cleanAndValidate = jest.fn(a => a);
  const chunkHandler = jest.fn(a => a);
  const fileReader = {
    abort: jest.fn(),
  };
  fileReader.readAsBinaryString = jest.fn(
    (binaryString = '123') => fileReader.onloadend(
      { target: { readyState: FileReader.DONE, result: binaryString } }
    )
  );

  const patternReader = {
    writeDataToPatternStream: jest.fn(),
    abortStream: jest.fn(),
  };

  const testJson = {
    'type': 'Feature',
    'geometry': {
      'type': 'Polygon',
      'coordinates': [[
        [-104.05, 78.99],
        [-87.22, 78.98],
        [-86.58, 75.94],
        [-104.03, 75.94],
        [-104.05, 78.99]
      ]]
    },
  };

  const getFileRef = (geoJsonObj = testJson) => {
    const fileContent = JSON.stringify(geoJsonObj);
    return new File([fileContent], 'test.json', { type: 'text/json' });
  };

  const getFileParseActiveFactory = (boolActive = true) => {
    return jest.fn(() => boolActive);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    require('./pattern_reader').PatternReader = function () {
      this.onGeoJSONFeaturePatternDetect = () => {};
      this.onStreamComplete = () => {};
      this.writeDataToPatternStream = () => patternReader.writeDataToPatternStream();
      this.abortStream = () => patternReader.abortStream();
    };
  });

  it('should reject and throw error if no file provided', async () => {
    await expect(fileHandler(null)).rejects.toThrow();
  });

  it('should abort on file reader error', () => {
    const fileRef = getFileRef();

    const fileReaderWithErrorCall = {
      ...fileReader,
    };
    // Trigger on error on read
    fileReaderWithErrorCall.readAsBinaryString =
      () => fileReaderWithErrorCall.onerror();
    const getFileParseActive = getFileParseActiveFactory();
    expect(fileHandler(
      fileRef, chunkHandler, cleanAndValidate, getFileParseActive,
      fileReaderWithErrorCall, FILE_BUFFER
    )).rejects.toThrow();

    expect(fileReader.abort.mock.calls.length).toEqual(1);
    expect(patternReader.abortStream.mock.calls.length).toEqual(1);
  });

  it('should abort and resolve to null if file parse cancelled', async () => {
    const fileRef = getFileRef();

    // Cancel file parse
    const getFileParseActive = getFileParseActiveFactory(false);

    const fileHandlerResult = await fileHandler(
      fileRef, chunkHandler, cleanAndValidate, getFileParseActive,
      fileReader, FILE_BUFFER
    );

    expect(fileHandlerResult).toBeNull();
    expect(patternReader.abortStream.mock.calls.length).toEqual(1);
  });

  // Expect 2 calls, one reads file, next is 'undefined' to
  // both fileReader and patternReader
  it('should normally read binary and emit to patternReader for valid data', async () => {
    const fileRef = getFileRef();
    const getFileParseActive = getFileParseActiveFactory();
    fileHandler(
      fileRef, chunkHandler, cleanAndValidate, getFileParseActive,
      fileReader, FILE_BUFFER
    );

    expect(fileReader.readAsBinaryString.mock.calls.length).toEqual(2);
    expect(patternReader.writeDataToPatternStream.mock.calls.length).toEqual(2);
  });
});
