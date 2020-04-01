/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { getInputIndex } from './get_input_output_index';
import { defaultIndexPattern } from '../../../../default_index_pattern';
import { AlertServices } from '../../../../../../../plugins/alerting/server';

describe('get_input_output_index', () => {
  let savedObjectsClient = savedObjectsClientMock.create();
  savedObjectsClient.get = jest.fn().mockImplementation(() => ({
    attributes: {},
  }));
  let servicesMock: AlertServices = {
    savedObjectsClient,
    callCluster: jest.fn(),
    alertInstanceFactory: jest.fn(),
  };

  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get = jest.fn().mockImplementation(() => ({
      attributes: {},
    }));
    servicesMock = {
      savedObjectsClient,
      callCluster: jest.fn(),
      alertInstanceFactory: jest.fn(),
    };
  });

  describe('getInputOutputIndex', () => {
    test('Returns inputIndex if inputIndex is passed in', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {},
      }));
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', ['test-input-index-1']);
      expect(inputIndex).toEqual(['test-input-index-1']);
    });

    test('Returns a saved object inputIndex if passed in inputIndex is undefined', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_INDEX_KEY]: ['configured-index-1', 'configured-index-2'],
        },
      }));
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', undefined);
      expect(inputIndex).toEqual(['configured-index-1', 'configured-index-2']);
    });

    test('Returns a saved object inputIndex if passed in inputIndex is null', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_INDEX_KEY]: ['configured-index-1', 'configured-index-2'],
        },
      }));
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', null);
      expect(inputIndex).toEqual(['configured-index-1', 'configured-index-2']);
    });

    test('Returns a saved object inputIndex default from constants if inputIndex passed in is null and the key is also null', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_INDEX_KEY]: null,
        },
      }));
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', null);
      expect(inputIndex).toEqual(defaultIndexPattern);
    });

    test('Returns a saved object inputIndex default from constants if inputIndex passed in is undefined and the key is also null', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_INDEX_KEY]: null,
        },
      }));
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', undefined);
      expect(inputIndex).toEqual(defaultIndexPattern);
    });

    test('Returns a saved object inputIndex default from constants if both passed in inputIndex and configuration attributes are missing and the index is undefined', async () => {
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', undefined);
      expect(inputIndex).toEqual(defaultIndexPattern);
    });

    test('Returns a saved object inputIndex default from constants if both passed in inputIndex and configuration attributes are missing and the index is null', async () => {
      const inputIndex = await getInputIndex(servicesMock, '8.0.0', null);
      expect(inputIndex).toEqual(defaultIndexPattern);
    });
  });
});
