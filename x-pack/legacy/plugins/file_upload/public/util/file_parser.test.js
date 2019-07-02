/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseAndClean, jsonPreview } from './file_parser';

describe('parse file', () => {
  const cleanAndValidate = jest.fn(a => a);
  const resolve = jest.fn();
  const reject = jest.fn();
  const previewFunction = jest.fn();

  beforeEach(() => {
    cleanAndValidate.mockClear();
    resolve.mockClear();
    reject.mockClear();
    previewFunction.mockClear();
  });

  it('should parse valid JSON', () => {
    const validJsonFileResult = {
      target: {
        result: JSON.stringify({
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
        })
      }
    };

    parseAndClean(cleanAndValidate, resolve, reject)(validJsonFileResult);
    // Confirm cleanAndValidate called
    expect(cleanAndValidate.mock.calls.length).toEqual(1);
    // Confirm resolve called
    expect(resolve.mock.calls.length).toEqual(1);
  });

  it('should reject invalid JSON', () => {
    const inValidJsonFileResult = {
      target: {
        result: 'this should not work'
      }
    };

    parseAndClean(cleanAndValidate, resolve, reject)(inValidJsonFileResult);
    // Confirm cleanAndValidate not called
    expect(cleanAndValidate.mock.calls.length).toEqual(0);
    // Confirm resolve not called
    expect(resolve.mock.calls.length).toEqual(0);
    // Confirm reject called
    expect(reject.mock.calls.length).toEqual(1);
  });

  it('should reject object instead of JSON', () => {
    const objectInsteadOfJson = {
      target: {
        result: {
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
        }
      }
    };

    parseAndClean(cleanAndValidate, resolve, reject)(objectInsteadOfJson);
    // Confirm cleanAndValidate not called
    expect(cleanAndValidate.mock.calls.length).toEqual(0);
    // Confirm resolve not called
    expect(resolve.mock.calls.length).toEqual(0);
    // Confirm reject called
    expect(reject.mock.calls.length).toEqual(1);
  });

  it('should call preview callback function if provided', () => {
    const justFinalJson = {
      'type': 'Feature',
      'geometry': {
        'type': 'Polygon',
        'coordinates': [[
          [-104.05, 78.99],
          [-87.22,  78.98],
          [-86.58,  75.94],
          [-104.03, 75.94],
          [-104.05, 78.99]
        ]]
      },
    };

    jsonPreview(justFinalJson, previewFunction);
    // Confirm preview function called
    expect(previewFunction.mock.calls.length).toEqual(1);
  });

  it('should use object clone for preview function', () => {
    const justFinalJson = {
      'type': 'Feature',
      'geometry': {
        'type': 'Polygon',
        'coordinates': [[
          [-104.05, 78.99],
          [-87.22,  78.98],
          [-86.58,  75.94],
          [-104.03, 75.94],
          [-104.05, 78.99]
        ]]
      },
    };

    jsonPreview(justFinalJson, previewFunction);
    // Confirm equal object passed
    expect(previewFunction.mock.calls[0][0]).toEqual(justFinalJson);
    // Confirm not the same object
    expect(previewFunction.mock.calls[0][0]).not.toBe(justFinalJson);
  });
});
