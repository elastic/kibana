/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JsonWatch } from './json_watch';

describe('JsonWatch', () => {
  describe('Constructor', () => {
    let props;
    beforeEach(() => {
      props = {
        watch: 'foo',
      };
    });

    it('should populate all expected fields', () => {
      const actual = new JsonWatch(props);
      const expected = {
        watch: 'foo',
      };

      expect(actual).toMatchObject(expected);
    });
  });

  describe('watchJson getter method', () => {
    let props;
    beforeEach(() => {
      props = {
        watch: { foo: 'bar' },
        metadata: {
          xpack: {
            type: 'json',
          },
        },
      };
    });

    it('should return the correct result', () => {
      const watch = new JsonWatch(props);
      const expected = {
        foo: 'bar',
        metadata: {
          xpack: {
            type: 'json',
          },
        },
      };
      expect(watch.watchJson).toEqual(expected);
    });
  });

  describe('upstreamJson getter method', () => {
    it('should return the correct result', () => {
      const watch = new JsonWatch({ watch: { foo: 'bar' } });
      const actual = watch.upstreamJson;
      const expected = {
        id: undefined,
        watch: {
          foo: 'bar',
          metadata: {
            xpack: {
              type: 'json',
            },
          },
        },
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('downstreamJson getter method', () => {
    let props;
    beforeEach(() => {
      props = {
        watch: 'foo',
        watchJson: 'bar',
      };
    });

    it('should return the correct result', () => {
      const watch = new JsonWatch(props);
      const actual = watch.downstreamJson;
      const expected = {
        watch: 'foo',
        isSystemWatch: false,
        actions: [],
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('fromUpstreamJson factory method', () => {
    let upstreamJson;
    beforeEach(() => {
      upstreamJson = {
        id: 'id',
        watchStatusJson: {},
        watchJson: {
          trigger: 'trigger',
          input: 'input',
          condition: 'condition',
          actions: 'actions',
          metadata: 'metadata',
          transform: 'transform',
          throttle_period: 'throttle_period',
          throttle_period_in_millis: 'throttle_period_in_millis',
        },
      };
    });

    it('should clone the watchJson property into a watch property', () => {
      const jsonWatch = JsonWatch.fromUpstreamJson(upstreamJson);

      expect(jsonWatch.watch).toEqual(upstreamJson.watchJson);
      expect(jsonWatch.watch).not.toBe(upstreamJson.watchJson);
    });

    it('should remove the metadata.name property from the watch property', () => {
      upstreamJson.watchJson.metadata = { name: 'foobar', foo: 'bar' };

      const jsonWatch = JsonWatch.fromUpstreamJson(upstreamJson);

      expect(jsonWatch.watch.metadata.name).toBe(undefined);
    });

    it('should remove the metadata.xpack property from the watch property', () => {
      upstreamJson.watchJson.metadata = {
        name: 'foobar',
        xpack: { prop: 'val' },
        foo: 'bar',
      };

      const jsonWatch = JsonWatch.fromUpstreamJson(upstreamJson);

      expect(jsonWatch.watch.metadata.xpack).toBe(undefined);
    });

    it('should remove an empty metadata property from the watch property', () => {
      upstreamJson.watchJson.metadata = { name: 'foobar' };

      const jsonWatch = JsonWatch.fromUpstreamJson(upstreamJson);

      expect(jsonWatch.watch.metadata).toBe(undefined);
    });
  });

  describe('fromDownstreamJson factory method', () => {
    let downstreamJson;
    beforeEach(() => {
      downstreamJson = {
        watch: { foo: { bar: 'baz' } },
      };
    });

    it('should copy the watch property', () => {
      const jsonWatch = JsonWatch.fromDownstreamJson(downstreamJson);

      expect(jsonWatch.watch).toEqual(downstreamJson.watch);
    });
  });
});
