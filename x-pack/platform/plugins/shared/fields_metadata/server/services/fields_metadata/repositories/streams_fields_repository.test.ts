/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamsFieldsRepository } from './streams_fields_repository';
import { FieldMetadata } from '../../../../common/fields_metadata/models/field_metadata';
import type { ExtractedStreamFields, StreamsFieldsExtractor } from './types';

describe('StreamsFieldsRepository class', () => {
  const mockStreamFields: ExtractedStreamFields = {
    message: {
      name: 'message',
      type: 'keyword',
      description: 'Log message from the stream',
      flat_name: 'message',
    },
    'stream.custom_field': {
      name: 'stream.custom_field',
      type: 'keyword',
      description: 'A custom field defined in the stream',
      flat_name: 'stream.custom_field',
    },
  };

  let streamsFieldsExtractor: jest.MockedFunction<StreamsFieldsExtractor>;

  beforeEach(() => {
    streamsFieldsExtractor = jest.fn().mockResolvedValue(mockStreamFields);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a StreamsFieldsRepository instance', () => {
      const repository = StreamsFieldsRepository.create({
        streamsFieldsExtractor,
      });

      expect(repository).toBeInstanceOf(StreamsFieldsRepository);
    });
  });

  describe('getByName', () => {
    let repository: StreamsFieldsRepository;

    beforeEach(() => {
      repository = StreamsFieldsRepository.create({
        streamsFieldsExtractor,
      });
    });

    it('should return undefined when streamName is not provided', async () => {
      const field = await repository.getByName('message', {});

      expect(field).toBeUndefined();
      expect(streamsFieldsExtractor).not.toHaveBeenCalled();
    });

    it('should fetch and return a field when streamName is provided', async () => {
      const field = await repository.getByName('message', { streamName: 'logs' });

      expect(streamsFieldsExtractor).toHaveBeenCalledWith({ streamName: 'logs' });
      expect(field).toBeInstanceOf(FieldMetadata);
      expect(field?.name).toBe('message');
      expect(field?.description).toBe('Log message from the stream');
      expect(field?.source).toBe('streams');
    });

    it('should return undefined for non-existent fields', async () => {
      const field = await repository.getByName('non.existent.field', { streamName: 'logs' });

      expect(streamsFieldsExtractor).toHaveBeenCalledWith({ streamName: 'logs' });
      expect(field).toBeUndefined();
    });

    it('should cache fields after the first fetch', async () => {
      // First call
      await repository.getByName('message', { streamName: 'logs' });
      expect(streamsFieldsExtractor).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await repository.getByName('stream.custom_field', { streamName: 'logs' });
      expect(streamsFieldsExtractor).toHaveBeenCalledTimes(1);
    });

    it('should fetch fields again for different streams', async () => {
      await repository.getByName('message', { streamName: 'logs' });
      expect(streamsFieldsExtractor).toHaveBeenCalledTimes(1);

      await repository.getByName('message', { streamName: 'logs.nginx' });
      expect(streamsFieldsExtractor).toHaveBeenCalledTimes(2);
    });

    it('should properly set source to "streams" for all fields', async () => {
      const field = await repository.getByName('stream.custom_field', { streamName: 'logs' });

      expect(field?.source).toBe('streams');
    });
  });
});
