/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RootSchema, SchemaArray } from '@elastic/ebt';
import {
  StreamsAIGrokSuggestionAcceptedProps,
  StreamsAIGrokSuggestionLatencyProps,
  StreamsAssetClickEventProps,
  StreamsAssetCountProps,
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

export {
  streamsAssetCountSchema,
  streamsAssetClickEventSchema,
  streamsAIGrokSuggestionLatencySchema,
  streamsAIGrokSuggestionAcceptedSchema,
};
