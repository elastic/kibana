/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_UPDATE_STREAM_TOOL_ID } from '../tool_ids';

describe('update_stream tool', () => {
  it('has the expected tool id', () => {
    expect(STREAMS_UPDATE_STREAM_TOOL_ID).toBe('platform.streams.update_stream');
  });
});
