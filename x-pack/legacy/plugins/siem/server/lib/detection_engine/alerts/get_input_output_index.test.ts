/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import {
  DEFAULT_SIGNALS_INDEX_KEY,
  DEFAULT_INDEX_KEY,
  DEFAULT_SIGNALS_INDEX,
} from '../../../../common/constants';
import { AlertServices } from '../../../../../alerting/server/types';
import { getInputOutputIndex, getOutputIndex, getInputIndex } from './get_input_output_index';
import { defaultIndexPattern } from '../../../../default_index_pattern';

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
    test('Returns inputIndex as is if inputIndex and outputIndex are both passed in', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {},
      }));
      const { inputIndex } = await getInputOutputIndex(
        servicesMock,
        '8.0.0',
        ['test-input-index-1'],
        'test-output-index'
      );
      expect(inputIndex).toEqual(['test-input-index-1']);
    });

    test('Returns outputIndex as is if inputIndex and outputIndex are both passed in', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {},
      }));
      const { outputIndex } = await getInputOutputIndex(
        servicesMock,
        '8.0.0',
        ['test-input-index-1'],
        'test-output-index'
      );
      expect(outputIndex).toEqual('test-output-index');
    });

    test('Returns inputIndex as is if inputIndex is defined but outputIndex is null', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {},
      }));
      const { inputIndex } = await getInputOutputIndex(
        servicesMock,
        '8.0.0',
        ['test-input-index-1'],
        null
      );
      expect(inputIndex).toEqual(['test-input-index-1']);
    });

    test('Returns outputIndex as is if inputIndex is null but outputIndex is defined', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {},
      }));
      const { outputIndex } = await getInputOutputIndex(
        servicesMock,
        '8.0.0',
        null,
        'test-output-index'
      );
      expect(outputIndex).toEqual('test-output-index');
    });

    test('Returns a saved object outputIndex if both passed in are undefined', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_SIGNALS_INDEX_KEY]: '.signals-test-index',
        },
      }));
      const { outputIndex } = await getInputOutputIndex(
        servicesMock,
        '8.0.0',
        undefined,
        undefined
      );
      expect(outputIndex).toEqual('.signals-test-index');
    });

    test('Returns a saved object outputIndex if passed in outputIndex is undefined', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_SIGNALS_INDEX_KEY]: '.signals-test-index',
        },
      }));
      const { outputIndex } = await getInputOutputIndex(
        servicesMock,
        '8.0.0',
        ['test-input-index-1'],
        undefined
      );
      expect(outputIndex).toEqual('.signals-test-index');
    });

    test('Returns a saved object outputIndex default from constants if both passed in input and configuration are null', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_SIGNALS_INDEX_KEY]: null,
        },
      }));
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {},
      }));
      const { outputIndex } = await getInputOutputIndex(servicesMock, '8.0.0', null, null);
      expect(outputIndex).toEqual(DEFAULT_SIGNALS_INDEX);
    });

    test('Returns a saved object outputIndex default from constants if both passed in input and configuration are missing', async () => {
      const { outputIndex } = await getInputOutputIndex(
        servicesMock,
        '8.0.0',
        undefined,
        undefined
      );
      expect(outputIndex).toEqual(DEFAULT_SIGNALS_INDEX);
    });

    test('Returns a saved object inputIndex if passed in inputIndex and outputIndex are undefined', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_INDEX_KEY]: ['configured-index-1', 'configured-index-2'],
        },
      }));
      const { inputIndex } = await getInputOutputIndex(servicesMock, '8.0.0', undefined, undefined);
      expect(inputIndex).toEqual(['configured-index-1', 'configured-index-2']);
    });

    test('Returns a saved object inputIndex if passed in inputIndex is undefined', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_INDEX_KEY]: ['configured-index-1', 'configured-index-2'],
        },
      }));
      const { inputIndex } = await getInputOutputIndex(
        servicesMock,
        '8.0.0',
        undefined,
        'output-index-1'
      );
      expect(inputIndex).toEqual(['configured-index-1', 'configured-index-2']);
    });

    test('Returns a saved object inputIndex default from constants if both passed in inputIndex and configuration is null', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_INDEX_KEY]: null,
        },
      }));
      const { inputIndex } = await getInputOutputIndex(servicesMock, '8.0.0', null, null);
      expect(inputIndex).toEqual(defaultIndexPattern);
    });

    test('Returns a saved object inputIndex default from constants if both passed in inputIndex and configuration attributes is missing', async () => {
      const { inputIndex } = await getInputOutputIndex(servicesMock, '8.0.0', undefined, undefined);
      expect(inputIndex).toEqual(defaultIndexPattern);
    });
  });

  describe('getOutputIndex', () => {
    test('test output index is returned when passed in as is', async () => {
      const mockConfiguration = await savedObjectsClient.get('config', '8.0.0');
      const outputIndex = getOutputIndex('output-index-1', mockConfiguration);
      expect(outputIndex).toEqual('output-index-1');
    });

    test('configured output index is returned when output index is null', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_SIGNALS_INDEX_KEY]: '.siem-test-signals',
        },
      }));
      const mockConfiguration = await savedObjectsClient.get('config', '8.0.0');
      const outputIndex = getOutputIndex(null, mockConfiguration);
      expect(outputIndex).toEqual('.siem-test-signals');
    });

    test('output index from constants is returned when output index is null and so is the configuration', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_SIGNALS_INDEX_KEY]: null,
        },
      }));
      const mockConfiguration = await savedObjectsClient.get('config', '8.0.0');
      const outputIndex = getOutputIndex(null, mockConfiguration);
      expect(outputIndex).toEqual(DEFAULT_SIGNALS_INDEX);
    });

    test('output index from constants is returned when output index is null and configuration is missing', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {},
      }));
      const mockConfiguration = await savedObjectsClient.get('config', '8.0.0');
      const outputIndex = getOutputIndex(null, mockConfiguration);
      expect(outputIndex).toEqual(DEFAULT_SIGNALS_INDEX);
    });

    test('output index from constants is returned when output index is null and attributes is missing', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({}));
      const mockConfiguration = await savedObjectsClient.get('config', '8.0.0');
      const outputIndex = getOutputIndex(null, mockConfiguration);
      expect(outputIndex).toEqual(DEFAULT_SIGNALS_INDEX);
    });
  });

  describe('getInputIndex', () => {
    test('test input index is returned when passed in as is', async () => {
      const mockConfiguration = await savedObjectsClient.get('config', '8.0.0');
      const inputIndex = getInputIndex(['input-index-1'], mockConfiguration);
      expect(inputIndex).toEqual(['input-index-1']);
    });

    test('configured input index is returned when input index is null', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_INDEX_KEY]: ['input-index-1', 'input-index-2'],
        },
      }));
      const mockConfiguration = await savedObjectsClient.get('config', '8.0.0');
      const inputIndex = getInputIndex(null, mockConfiguration);
      expect(inputIndex).toEqual(['input-index-1', 'input-index-2']);
    });

    test('input index from constants is returned when input index is null and so is the configuration', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {
          [DEFAULT_INDEX_KEY]: null,
        },
      }));
      const mockConfiguration = await savedObjectsClient.get('config', '8.0.0');
      const inputIndex = getInputIndex(null, mockConfiguration);
      expect(inputIndex).toEqual(defaultIndexPattern);
    });

    test('input index from constants is returned when input index is null and configuration is missing', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({
        attributes: {},
      }));
      const mockConfiguration = await savedObjectsClient.get('config', '8.0.0');
      const inputIndex = getInputIndex(null, mockConfiguration);
      expect(inputIndex).toEqual(defaultIndexPattern);
    });

    test('input index from constants is returned when input index is null and attributes is missing', async () => {
      savedObjectsClient.get = jest.fn().mockImplementation(() => ({}));
      const mockConfiguration = await savedObjectsClient.get('config', '8.0.0');
      const inputIndex = getInputIndex(null, mockConfiguration);
      expect(inputIndex).toEqual(defaultIndexPattern);
    });
  });
});
