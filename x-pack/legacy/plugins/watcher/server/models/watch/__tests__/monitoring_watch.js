/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import expect from '@kbn/expect';
import sinon from 'sinon';
import proxyquire from 'proxyquire';

const constructorMock = sinon.stub();
const downstreamJsonMock = sinon.stub();
const getPropsFromUpstreamJsonMock = sinon.stub();
class BaseWatchStub {
  constructor(props) {
    constructorMock(props);
  }

  get downstreamJson() {
    downstreamJsonMock();

    return {
      baseCalled: true
    };
  }

  static getPropsFromUpstreamJson(json) {
    getPropsFromUpstreamJsonMock();
    return pick(json, 'watchJson');
  }
}

const { MonitoringWatch } = proxyquire('../monitoring_watch', {
  './base_watch': { BaseWatch: BaseWatchStub }
});

describe('MonitoringWatch', () => {

  describe('Constructor', () => {

    let props;
    beforeEach(() => {
      constructorMock.resetHistory();

      props = {};
    });

    it('should call the BaseWatch constructor', () => {
      new MonitoringWatch(props);
      expect(constructorMock.called).to.be(true);
    });

    it('should populate all expected fields', () => {
      const actual = new MonitoringWatch(props);
      const expected = {
        isSystemWatch: true
      };

      expect(actual).to.eql(expected);
    });

  });

  describe('watchJson getter method', () => {

    it('should return an empty object', () => {
      const watch = new MonitoringWatch({});
      const actual = watch.watchJson;
      const expected = {};

      expect(actual).to.eql(expected);
    });

  });

  describe('getVisualizeQuery method', () => {

    it(`throws an error`, () => {
      const watch = new MonitoringWatch({});

      expect(watch.getVisualizeQuery).to.throwError(/getVisualizeQuery called for monitoring watch/i);
    });

  });

  describe('formatVisualizeData method', () => {

    it(`throws an error`, () => {
      const watch = new MonitoringWatch({});

      expect(watch.formatVisualizeData).to.throwError(/formatVisualizeData called for monitoring watch/i);
    });

  });

  describe('upstreamJson getter method', () => {

    it(`throws an error`, () => {
      const watch = new MonitoringWatch({});

      expect(() => watch.upstreamJson).to.throwError(/upstreamJson called for monitoring watch/i);
    });

  });

  describe('downstreamJson getter method', () => {

    let props;
    beforeEach(() => {
      downstreamJsonMock.resetHistory();

      props = {};
    });

    it('should call the getter from WatchBase and return the correct result', () => {
      const watch = new MonitoringWatch(props);
      const actual = watch.downstreamJson;
      const expected = {
        baseCalled: true
      };

      expect(downstreamJsonMock.called).to.be(true);
      expect(actual).to.eql(expected);
    });

  });

  describe('fromUpstreamJson factory method', () => {

    beforeEach(() => {
      getPropsFromUpstreamJsonMock.resetHistory();
    });

    it('should call the getPropsFromUpstreamJson method of BaseWatch', () => {
      MonitoringWatch.fromUpstreamJson({});

      expect(getPropsFromUpstreamJsonMock.called).to.be(true);
    });

    it('should generate a valid MonitoringWatch object', () => {
      const actual = MonitoringWatch.fromUpstreamJson({});
      const expected = { isSystemWatch: true };

      expect(actual).to.eql(expected);
    });

  });

  describe('fromDownstreamJson factory method', () => {

    it(`throws an error`, () => {
      expect(MonitoringWatch.fromDownstreamJson).withArgs({})
        .to.throwError(/fromDownstreamJson called for monitoring watch/i);
    });

  });

});
