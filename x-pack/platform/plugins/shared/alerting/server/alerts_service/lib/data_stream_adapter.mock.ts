/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamAdapter, GetDataStreamAdapterOpts } from './data_stream_adapter';

export function createDataStreamAdapterMock(opts?: GetDataStreamAdapterOpts): DataStreamAdapter {
  return {
    isUsingDataStreams: jest.fn().mockReturnValue(false),
    getIndexTemplateFields: jest.fn().mockReturnValue({
      index_patterns: ['index-pattern'],
    }),
    createStream: jest.fn(),
  };
}
