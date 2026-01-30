/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  streamsDescriptionGeneratedSchema,
  streamsSystemIdentificationIdentifiedSchema,
  streamsSignificantEventsQueriesGeneratedSchema,
  streamsFeaturesIdentifiedSchema,
  streamsInsightsGeneratedSchema,
} from './schemas';

describe('EBT Schemas', () => {
  describe('streamsDescriptionGeneratedSchema', () => {
    it('includes cached_tokens_used field as optional long type', () => {
      expect(streamsDescriptionGeneratedSchema).toHaveProperty('cached_tokens_used');
      expect(streamsDescriptionGeneratedSchema.cached_tokens_used).toEqual({
        type: 'long',
        _meta: {
          description: 'The number of cached tokens used for the generation request',
          optional: true,
        },
      });
    });

    it('includes all required token fields', () => {
      expect(streamsDescriptionGeneratedSchema).toHaveProperty('input_tokens_used');
      expect(streamsDescriptionGeneratedSchema).toHaveProperty('output_tokens_used');
      expect(streamsDescriptionGeneratedSchema.input_tokens_used.type).toBe('long');
      expect(streamsDescriptionGeneratedSchema.output_tokens_used.type).toBe('long');
    });
  });

  describe('streamsSystemIdentificationIdentifiedSchema', () => {
    it('includes cached_tokens_used field as optional long type', () => {
      expect(streamsSystemIdentificationIdentifiedSchema).toHaveProperty('cached_tokens_used');
      expect(streamsSystemIdentificationIdentifiedSchema.cached_tokens_used).toEqual({
        type: 'long',
        _meta: {
          description: 'The number of cached tokens used for the generation request',
          optional: true,
        },
      });
    });

    it('includes all required token fields', () => {
      expect(streamsSystemIdentificationIdentifiedSchema).toHaveProperty('input_tokens_used');
      expect(streamsSystemIdentificationIdentifiedSchema).toHaveProperty('output_tokens_used');
      expect(streamsSystemIdentificationIdentifiedSchema.input_tokens_used.type).toBe('long');
      expect(streamsSystemIdentificationIdentifiedSchema.output_tokens_used.type).toBe('long');
    });

    it('includes count field', () => {
      expect(streamsSystemIdentificationIdentifiedSchema).toHaveProperty('count');
      expect(streamsSystemIdentificationIdentifiedSchema.count.type).toBe('long');
    });
  });

  describe('streamsSignificantEventsQueriesGeneratedSchema', () => {
    it('includes cached_tokens_used field as optional long type', () => {
      expect(streamsSignificantEventsQueriesGeneratedSchema).toHaveProperty('cached_tokens_used');
      expect(streamsSignificantEventsQueriesGeneratedSchema.cached_tokens_used).toEqual({
        type: 'long',
        _meta: {
          description: 'The number of cached tokens used for the generation request',
          optional: true,
        },
      });
    });

    it('includes all required token fields', () => {
      expect(streamsSignificantEventsQueriesGeneratedSchema).toHaveProperty('input_tokens_used');
      expect(streamsSignificantEventsQueriesGeneratedSchema).toHaveProperty('output_tokens_used');
      expect(streamsSignificantEventsQueriesGeneratedSchema.input_tokens_used.type).toBe('long');
      expect(streamsSignificantEventsQueriesGeneratedSchema.output_tokens_used.type).toBe('long');
    });

    it('includes count and systems_count fields', () => {
      expect(streamsSignificantEventsQueriesGeneratedSchema).toHaveProperty('count');
      expect(streamsSignificantEventsQueriesGeneratedSchema).toHaveProperty('systems_count');
      expect(streamsSignificantEventsQueriesGeneratedSchema.count.type).toBe('long');
      expect(streamsSignificantEventsQueriesGeneratedSchema.systems_count.type).toBe('long');
    });
  });

  describe('streamsFeaturesIdentifiedSchema', () => {
    it('includes cached_tokens_used field as optional long type', () => {
      expect(streamsFeaturesIdentifiedSchema).toHaveProperty('cached_tokens_used');
      expect(streamsFeaturesIdentifiedSchema.cached_tokens_used).toEqual({
        type: 'long',
        _meta: {
          description: 'The number of cached tokens used for the generation request',
          optional: true,
        },
      });
    });

    it('includes all required token fields', () => {
      expect(streamsFeaturesIdentifiedSchema).toHaveProperty('input_tokens_used');
      expect(streamsFeaturesIdentifiedSchema).toHaveProperty('output_tokens_used');
      expect(streamsFeaturesIdentifiedSchema.input_tokens_used.type).toBe('long');
      expect(streamsFeaturesIdentifiedSchema.output_tokens_used.type).toBe('long');
    });

    it('includes count field', () => {
      expect(streamsFeaturesIdentifiedSchema).toHaveProperty('count');
      expect(streamsFeaturesIdentifiedSchema.count.type).toBe('long');
    });

    it('includes stream_name and stream_type fields', () => {
      expect(streamsFeaturesIdentifiedSchema).toHaveProperty('stream_name');
      expect(streamsFeaturesIdentifiedSchema).toHaveProperty('stream_type');
      expect(streamsFeaturesIdentifiedSchema.stream_name.type).toBe('keyword');
      expect(streamsFeaturesIdentifiedSchema.stream_type.type).toBe('keyword');
    });
  });

  describe('streamsInsightsGeneratedSchema', () => {
    it('includes cached_tokens_used field as optional long type', () => {
      expect(streamsInsightsGeneratedSchema).toHaveProperty('cached_tokens_used');
      expect(streamsInsightsGeneratedSchema.cached_tokens_used).toEqual({
        type: 'long',
        _meta: {
          description: 'The number of cached tokens used for the generation request',
          optional: true,
        },
      });
    });

    it('includes all required token fields', () => {
      expect(streamsInsightsGeneratedSchema).toHaveProperty('input_tokens_used');
      expect(streamsInsightsGeneratedSchema).toHaveProperty('output_tokens_used');
      expect(streamsInsightsGeneratedSchema.input_tokens_used.type).toBe('long');
      expect(streamsInsightsGeneratedSchema.output_tokens_used.type).toBe('long');
    });
  });
});
