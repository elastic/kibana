/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitoringWatch } from './monitoring_watch';

describe('MonitoringWatch', () => {
  describe('Constructor', () => {
    let props;
    beforeEach(() => {
      props = {};
    });

    it('should populate all expected fields', () => {
      const actual = new MonitoringWatch(props);
      const expected = {
        isSystemWatch: true
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('watchJson getter method', () => {
    it('should return an empty object', () => {
      const watch = new MonitoringWatch({});
      const actual = watch.watchJson;
      const expected = {
        metadata: {
          xpack: {},
        },
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('getVisualizeQuery method', () => {
    it(`throws an error`, () => {
      const watch = new MonitoringWatch({});

      expect(() => watch.getVisualizeQuery()).toThrow(/getVisualizeQuery called for monitoring watch/i);
    });
  });

  describe('formatVisualizeData method', () => {
    it(`throws an error`, () => {
      const watch = new MonitoringWatch({});

      expect(() => watch.formatVisualizeData()).toThrow(/formatVisualizeData called for monitoring watch/i);
    });
  });

  describe('upstreamJson getter method', () => {
    it(`throws an error`, () => {
      const watch = new MonitoringWatch({});

      expect(() => watch.upstreamJson).toThrow(/upstreamJson called for monitoring watch/i);
    });
  });

  describe('downstreamJson getter method', () => {
    let props;
    beforeEach(() => {
      props = {};
    });

    it('should return the correct result', () => {
      const watch = new MonitoringWatch(props);
      const actual = watch.downstreamJson;
      const expected = {
        actions: [],
        isSystemWatch: true,
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('fromUpstreamJson factory method', () => {
    it('should generate a valid MonitoringWatch object', () => {
      const actual = MonitoringWatch.fromUpstreamJson({
        id: 'id',
        watchJson: {},
        watchStatusJson: {},
      });

      const expected = {
        id: 'id',
        isSystemWatch: true,
        actions: [],
        type: 'monitoring',
      };

      expect(actual).toMatchObject(expected);
    });
  });

  describe('fromDownstreamJson factory method', () => {
    it(`throws an error`, () => {
      expect(() => MonitoringWatch.fromDownstreamJson({}))
        .toThrow(/fromDownstreamJson called for monitoring watch/i);
    });
  });
});
