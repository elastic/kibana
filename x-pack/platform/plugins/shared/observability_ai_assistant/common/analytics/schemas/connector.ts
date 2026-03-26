/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { InferenceConnector } from '../../utils/get_inference_connector';

export interface Connector {
  connector: InferenceConnector | undefined;
}

export const connectorSchema: RootSchema<Connector['connector']> = {
  connectorId: {
    type: 'text',
    _meta: {
      description: 'The id of the connector.',
    },
  },
  name: {
    type: 'text',
    _meta: {
      description: 'The name of the connector.',
    },
  },
  type: {
    type: 'text',
    _meta: {
      description: 'The action type id of the connector.',
    },
  },
  modelFamily: {
    type: 'text',
    _meta: {
      description: 'The model family of the connector.',
    },
  },
  modelProvider: {
    type: 'text',
    _meta: {
      description: 'The model provider of the connector.',
    },
  },
  modelId: {
    type: 'text',
    _meta: {
      description: 'The model id of the connector, if applicable.',
      optional: true,
    },
  },
};
