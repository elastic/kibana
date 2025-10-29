/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasSupportedStreamsRoot } from './root_stream_definition';

describe('root_stream_definition', () => {
  describe('hasSupportedStreamsRoot', () => {
    it('returns true for the "logs" root stream', () => {
      expect(hasSupportedStreamsRoot('logs')).toBe(true);
    });

    it('returns true for a child of the "logs" root stream', () => {
      expect(hasSupportedStreamsRoot('logs.my_stream')).toBe(true);
    });

    it('returns true for the "alerts" root stream', () => {
      expect(hasSupportedStreamsRoot('alerts')).toBe(true);
    });

    it('returns true for a child of the "alerts" root stream', () => {
      expect(hasSupportedStreamsRoot('alerts.my_alerts')).toBe(true);
    });

    it('returns false for an unsupported root stream', () => {
      expect(hasSupportedStreamsRoot('metrics')).toBe(false);
    });

    it('returns false for a stream with no root', () => {
      expect(hasSupportedStreamsRoot('my_stream')).toBe(false);
    });
  });
});
