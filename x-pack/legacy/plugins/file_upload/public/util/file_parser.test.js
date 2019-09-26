/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseFile } from './file_parser';

describe('parse file', () => {
  const cleanAndValidate = jest.fn(a => a);
  const previewFunction = jest.fn();
  const transformDetails = {
    cleanAndValidate
  };
  const getFileRef = fileContent =>
    new File([fileContent], 'test.json', { type: 'text/json' });

  beforeEach(() => {
    cleanAndValidate.mockClear();
    previewFunction.mockClear();
  });

  it('should parse valid JSON', async () => {
    const validJsonFileResult = JSON.stringify({
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
    });

    await parseFile(getFileRef(validJsonFileResult), transformDetails);
    // Confirm cleanAndValidate called
    expect(cleanAndValidate.mock.calls.length).toEqual(1);
    // Confirm preview function not called
    expect(previewFunction.mock.calls.length).toEqual(0);
  });

  it('should call preview callback function if provided', async () => {
    const validJsonFileResult = JSON.stringify({
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
    });

    await parseFile(getFileRef(validJsonFileResult), transformDetails, previewFunction);
    // Confirm preview function called
    expect(previewFunction.mock.calls.length).toEqual(1);
  });
});
