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
  StreamsAIDissectSuggestionAcceptedProps,
  StreamsAIDissectSuggestionLatencyProps,
  StreamsAttachmentClickEventProps,
  StreamsAttachmentCountProps,
  StreamsChildStreamCreatedProps,
  StreamsProcessingSavedProps,
  StreamsRetentionChangedProps,
  StreamsSchemaUpdatedProps,
  StreamsSignificantEventsCreatedProps,
  StreamsSignificantEventsSuggestionsGeneratedEventProps,
  WiredStreamsStatusChangedProps,
} from './types';

const streamsAttachmentCountSchema: RootSchema<StreamsAttachmentCountProps> = {
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

const streamsAttachmentClickEventSchema: RootSchema<StreamsAttachmentClickEventProps> = {
  name: {
    type: 'keyword',
    _meta: {
      description: 'The name of the Stream',
    },
  },
  attachment_type: {
    type: 'keyword',
    _meta: {
      description: 'The type of attachment: dashboard, slo, rule',
    },
  },
  attachment_id: {
    type: 'keyword',
    _meta: {
      description: 'The id of the attachment',
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

const streamsAIDissectSuggestionLatencySchema: RootSchema<StreamsAIDissectSuggestionLatencyProps> =
  {
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

const streamsAIDissectSuggestionAcceptedSchema: RootSchema<StreamsAIDissectSuggestionAcceptedProps> =
  {
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
  streamsAttachmentCountSchema,
  streamsAttachmentClickEventSchema,
  streamsAIGrokSuggestionLatencySchema,
  streamsAIGrokSuggestionAcceptedSchema,
  streamsAIDissectSuggestionLatencySchema,
  streamsAIDissectSuggestionAcceptedSchema,
  streamsRetentionChangedSchema,
  streamsProcessingSavedSchema,
  streamsChildStreamCreatedSchema,
  streamsSchemaUpdatedSchema,
  streamsSignificantEventsSuggestionsGeneratedSchema,
  streamsSignificantEventsCreatedSchema,
  wiredStreamsStatusChangedSchema,
};
