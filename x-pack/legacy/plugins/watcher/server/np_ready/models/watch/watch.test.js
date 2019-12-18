/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WATCH_TYPES } from '../../../../common/constants';
import { Watch } from './watch';
import { JsonWatch } from './json_watch';
import { MonitoringWatch } from './monitoring_watch';
import { ThresholdWatch } from './threshold_watch';

describe('Watch', () => {
  describe('getWatchTypes factory method', () => {
    it(`There should be a property for each watch type`, () => {
      const watchTypes = Watch.getWatchTypes();
      const expected = Object.values(WATCH_TYPES).sort();
      const actual = Object.keys(watchTypes).sort();

      expect(actual).toEqual(expected);
    });
  });

  describe('fromDownstreamJson factory method', () => {
    it(`throws an error if no 'type' property in json`, () => {
      expect(() => Watch.fromDownstreamJson({})).toThrow(/must contain an type property/i);
    });

    it(`throws an error if the type does not correspond to a WATCH_TYPES value`, () => {
      expect(() => Watch.fromDownstreamJson({ type: 'foo' })).toThrow(
        /Attempted to load unknown type foo/i
      );
    });

    it('JsonWatch to be used when type is WATCH_TYPES.JSON', () => {
      const config = { type: WATCH_TYPES.JSON };
      expect(Watch.fromDownstreamJson(config)).toEqual(JsonWatch.fromDownstreamJson(config));
    });

    it('ThresholdWatch to be used when type is WATCH_TYPES.THRESHOLD', () => {
      const config = { type: WATCH_TYPES.THRESHOLD };
      expect(Watch.fromDownstreamJson(config)).toEqual(ThresholdWatch.fromDownstreamJson(config));
    });

    it('MonitoringWatch to be used when type is WATCH_TYPES.MONITORING', () => {
      const config = { type: WATCH_TYPES.MONITORING };
      expect(() => Watch.fromDownstreamJson(config)).toThrowError();
    });
  });

  describe('fromUpstreamJson factory method', () => {
    it(`throws an error if no 'watchJson' property in json`, () => {
      expect(() => Watch.fromUpstreamJson({})).toThrow(/must contain a watchJson property/i);
    });

    it('JsonWatch to be used when type is WATCH_TYPES.JSON', () => {
      const config = {
        id: 'id',
        watchStatusJson: {},
        watchJson: { metadata: { xpack: { type: WATCH_TYPES.JSON } } },
      };
      expect(Watch.fromUpstreamJson(config)).toEqual(JsonWatch.fromUpstreamJson(config));
    });

    it('ThresholdWatch to be used when type is WATCH_TYPES.THRESHOLD', () => {
      const config = {
        id: 'id',
        watchStatusJson: {},
        watchJson: { metadata: { watcherui: {}, xpack: { type: WATCH_TYPES.THRESHOLD } } },
      };
      expect(Watch.fromUpstreamJson(config)).toEqual(ThresholdWatch.fromUpstreamJson(config));
    });

    it('MonitoringWatch to be used when type is WATCH_TYPES.MONITORING', () => {
      const config = {
        id: 'id',
        watchStatusJson: {},
        watchJson: { metadata: { xpack: { type: WATCH_TYPES.MONITORING } } },
      };
      expect(Watch.fromUpstreamJson(config)).toEqual(MonitoringWatch.fromUpstreamJson(config));
    });
  });
});
