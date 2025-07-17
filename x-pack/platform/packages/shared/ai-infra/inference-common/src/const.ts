/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticModelDictionary } from './types';
import { elasticModelIds } from './inference_endpoints';

export const elasticModelDictionary: ElasticModelDictionary = {
  [elasticModelIds.RainbowSprinkles]: {
    provider: 'bedrock',
    model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
  },
};
