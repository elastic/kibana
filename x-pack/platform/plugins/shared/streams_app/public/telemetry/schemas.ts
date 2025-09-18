/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema, SchemaArray } from '@elastic/ebt';
import type {
  StreamsAIGrokSuggestionAcceptedProps,
  StreamsAIGrokSuggestionLatencyProps,
  StreamsAssetClickEventProps,
  StreamsAssetCountProps,
  StreamsChildStreamCreatedProps,
  StreamsProcessingSavedProps,
  StreamsRetentionChangedProps,
  StreamsSchemaUpdatedProps,
  StreamsSignificantEventsCreatedProps,
  StreamsSignificantEventsSuggestionsGeneratedEventProps,
  WiredStreamsStatusChangedProps,
} from './types';

const streamsAssetCountSchema: RootSchema<StreamsAssetCountProps> = {
  name: {
    type: 'keyword',
    _meta: {
      description: 'The name of the Stream',
    },
  },
  dashboards: {
    type: 'long',
    _meta: {
      description: 'The duration of the endpoint in milliseconds',
    },
  },
  slos: {
    type: 'long',
    _meta: {
      description: 'The duration of the endpoint in milliseconds',
      optional: true,
    },
  },
  rules: {
    type: 'long',
    _meta: {
      description: 'The duration of the endpoint in milliseconds',
      optional: true,
    },
  },
};

const streamsAssetClickEventSchema: RootSchema<StreamsAssetClickEventProps> = {
  name: {
    type: 'keyword',
    _meta: {
      description: 'The name of the Stream',
    },
  },
  asset_type: {
    type: 'keyword',
    _meta: {
      description: 'The type of asset: dashboard, slo, rule',
    },
  },
  asset_id: {
    type: 'keyword',
    _meta: {
      description: 'The id of the asset',
    },
  },
};

const matchRate: SchemaArray<number, number> = {
  type: 'array',
  items: {
    type: 'float',
    _meta: {
      description: 'The rate',
    },
  },
  _meta: {
    description: 'The success rate of each match',
  },
};

const streamsAIGrokSuggestionLatencySchema: RootSchema<StreamsAIGrokSuggestionLatencyProps> = {
  name: {
    type: 'keyword',
    _meta: {
      description: 'The name of the Stream',
    },
  },
  field: {
    type: 'keyword',
    _meta: {
      description: 'The name of the field used.',
    },
  },
  connector_id: {
    type: 'keyword',
    _meta: {
      description: 'The ID of the LLM connector',
    },
  },
  suggestion_count: {
    type: 'long',
    _meta: {
      description: 'The number of suggestions in the response',
    },
  },
  match_rate: matchRate,
  duration_ms: {
    type: 'long',
    _meta: {
      description: 'The duration of the request',
    },
  },
};

const streamsAIGrokSuggestionAcceptedSchema: RootSchema<StreamsAIGrokSuggestionAcceptedProps> = {
  name: {
    type: 'keyword',
    _meta: {
      description: 'The name of the Stream',
    },
  },
  field: {
    type: 'keyword',
    _meta: {
      description: 'The name of the field used.',
    },
  },
  connector_id: {
    type: 'keyword',
    _meta: {
      description: 'The ID of the LLM connector',
    },
  },
  match_rate: {
    type: 'float',
    _meta: {
      description: 'The success rate of suggestion',
    },
  },
  detected_fields: {
    type: 'long',
    _meta: {
      description: 'The number of detected fields',
    },
  },
};

const wiredStreamsStatusChangedSchema: RootSchema<WiredStreamsStatusChangedProps> = {
  is_enabled: {
    type: 'boolean',
    _meta: {
      description: 'Whether wired streams was enabled or disabled',
    },
  },
};

const streamsProcessingSavedSchema: RootSchema<StreamsProcessingSavedProps> = {
  processors_count: {
    type: 'long',
    _meta: {
      description: 'The number of processors configured on the stream',
    },
  },
  stream_type: {
    type: 'keyword',
    _meta: {
      description: 'The type of the stream: wired or classic',
    },
  },
};

const streamsRetentionChangedSchema: RootSchema<StreamsRetentionChangedProps> = {
  lifecycle_type: {
    type: 'keyword',
    _meta: {
      description: 'The type of lifecycle: dsl, ilm, inherit',
    },
  },
  lifecycle_value: {
    type: 'keyword',
    _meta: {
      description: 'The lifecycle value, if applicable',
      optional: true,
    },
  },
  stream_type: {
    type: 'keyword',
    _meta: {
      description: 'The type of the stream: wired or classic',
    },
  },
};

const streamsChildStreamCreatedSchema: RootSchema<StreamsChildStreamCreatedProps> = {
  name: {
    type: 'keyword',
    _meta: {
      description: 'The name of the child stream',
    },
  },
};

const streamsSchemaUpdatedSchema: RootSchema<StreamsSchemaUpdatedProps> = {
  stream_type: {
    type: 'keyword',
    _meta: {
      description: 'The type of the stream: wired or classic',
    },
  },
};

const streamsSignificantEventsSuggestionsGeneratedSchema: RootSchema<StreamsSignificantEventsSuggestionsGeneratedEventProps> =
  {
    duration_ms: {
      type: 'long',
      _meta: {
        description:
          'The time (in milliseconds) it took to generate significant events suggestions',
      },
    },
    stream_type: {
      type: 'keyword',
      _meta: {
        description: 'The type of the stream: wired or classic',
      },
    },
  };

const streamsSignificantEventsCreatedSchema: RootSchema<StreamsSignificantEventsCreatedProps> = {
  count: {
    type: 'long',
    _meta: {
      description: 'The number of significant events created',
    },
  },
  stream_type: {
    type: 'keyword',
    _meta: {
      description: 'The type of the stream: wired or classic',
    },
  },
};

export {
  streamsAssetCountSchema,
  streamsAssetClickEventSchema,
  streamsAIGrokSuggestionLatencySchema,
  streamsAIGrokSuggestionAcceptedSchema,
  streamsRetentionChangedSchema,
  streamsProcessingSavedSchema,
  streamsChildStreamCreatedSchema,
  streamsSchemaUpdatedSchema,
  streamsSignificantEventsSuggestionsGeneratedSchema,
  streamsSignificantEventsCreatedSchema,
  wiredStreamsStatusChangedSchema,
};
