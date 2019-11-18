/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { COMPARATORS, SORT_ORDERS } from '../../../../../common/constants';
import { WatchErrors } from '../../watch_errors';
import { ThresholdWatch } from './threshold_watch';

describe('ThresholdWatch', () => {
  describe('Constructor', () => {
    let props;
    beforeEach(() => {
      props = {
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
      };
    });

    it('should populate all expected fields', () => {
      const actual = new ThresholdWatch(props);
      const expected = {
        id: undefined,
        name: undefined,
        type: undefined,
        isSystemWatch: false,
        watchStatus: undefined,
        watchErrors: undefined,
        actions: undefined,
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('hasTermAgg getter method', () => {

    it('should return true if termField is defined', () => {
      const downstreamJson = { termField: 'foobar' };
      const thresholdWatch = ThresholdWatch.fromDownstreamJson(downstreamJson);

      expect(thresholdWatch.hasTermsAgg).toBe(true);
    });

    it('should return false if termField is undefined', () => {
      const downstreamJson = { termField: undefined };
      const thresholdWatch = ThresholdWatch.fromDownstreamJson(downstreamJson);

      expect(thresholdWatch.hasTermsAgg).toBe(false);
    });

  });

  describe('termOrder getter method', () => {

    it('should return SORT_ORDERS.DESCENDING if thresholdComparator is COMPARATORS.GREATER_THAN', () => {
      const downstreamJson = { thresholdComparator: COMPARATORS.GREATER_THAN };
      const thresholdWatch = ThresholdWatch.fromDownstreamJson(downstreamJson);

      expect(thresholdWatch.termOrder).toBe(SORT_ORDERS.DESCENDING);
    });

    it('should return SORT_ORDERS.ASCENDING if thresholdComparator is not COMPARATORS.GREATER_THAN', () => {
      const downstreamJson = { thresholdComparator: 'foo' };
      const thresholdWatch = ThresholdWatch.fromDownstreamJson(downstreamJson);

      expect(thresholdWatch.termOrder).toBe(SORT_ORDERS.ASCENDING);
    });
  });

  describe('downstreamJson getter method', () => {
    let props;
    beforeEach(() => {
      props = {
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
      };
    });

    it('should return the correct result', () => {
      const watch = new ThresholdWatch(props);
      const actual = watch.downstreamJson;
      const expected = {
        actions: [],
        isSystemWatch: false,
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
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
          foo: { bar: 'baz' },
          metadata: {
            name: 'name',
            watcherui: {
              index: 'index',
              time_field: 'timeField',
              trigger_interval_size: 'triggerIntervalSize',
              trigger_interval_unit: 'triggerIntervalUnit',
              agg_type: 'aggType',
              agg_field: 'aggField',
              term_size: 'termSize',
              term_field: 'termField',
              threshold_comparator: 'thresholdComparator',
              time_window_size: 'timeWindowSize',
              time_window_unit: 'timeWindowUnit',
              threshold: 'threshold'
            }
          }
        }
      };
    });

    it('should generate a valid ThresholdWatch object', () => {
      const actual = ThresholdWatch.fromUpstreamJson(upstreamJson);
      const expected = {
        id: 'id',
        name: 'name',
        isSystemWatch: false,
        type: 'threshold',
        actions: [],
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: ['threshold'],
        watchErrors: new WatchErrors(),
      };

      expect(actual).toMatchObject(expected);
    });
  });

  describe('fromDownstreamJson factory method', () => {
    let downstreamJson;
    beforeEach(() => {
      downstreamJson = {
        id: 'id',
        name: 'name',
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold',
      };
    });

    it('should generate a valid ThresholdWatch object', () => {
      const actual = ThresholdWatch.fromDownstreamJson(downstreamJson);
      const expected = {
        id: 'id',
        name: 'name',
        isSystemWatch: false,
        type: 'threshold',
        index: 'index',
        actions: undefined,
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold',
        watchErrors: undefined,
        watchStatus: undefined,
      };

      expect(actual).toEqual(expected);
    });
  });
});
