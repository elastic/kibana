/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import proxyquire from 'proxyquire';
import expect from '@kbn/expect';
import sinon from 'sinon';

const actionFromUpstreamJSONMock = sinon.stub();
const actionFromDownstreamJSONMock = sinon.stub();
const watchStatusFromUpstreamJSONMock = sinon.stub();
const watchErrorsFromUpstreamJSONMock = sinon.stub();

class ActionStub {
  static fromUpstreamJson(...args) {
    actionFromUpstreamJSONMock(...args);
    return { foo: 'bar' };
  }

  static fromDownstreamJson(...args) {
    actionFromDownstreamJSONMock(...args);
    return { foo: 'bar' };
  }
}

class WatchStatusStub {
  static fromUpstreamJson(...args) {
    watchStatusFromUpstreamJSONMock(...args);
    return { foo: 'bar' };
  }
}

class WatchErrorsStub {
  static fromUpstreamJson(...args) {
    watchErrorsFromUpstreamJSONMock(...args);
    return { foo: 'bar' };
  }
}

const { BaseWatch } = proxyquire('../base_watch', {
  '../action': { Action: ActionStub },
  '../watch_status': { WatchStatus: WatchStatusStub },
  '../watch_errors': { WatchErrors: WatchErrorsStub },
});

describe('BaseWatch', () => {

  describe('Constructor', () => {

    let props;
    beforeEach(() => {
      props = {
        id: 'my-watch',
        name: 'foo',
        type: 'logging'
      };
    });

    it('should return a valid object', () => {
      const watch = new BaseWatch(props);
      const actual = Object.keys(watch);
      const expected = [
        'id',
        'name',
        'type',
        'isSystemWatch',
        'watchStatus',
        'watchErrors',
        'actions'
      ];

      expect(actual).to.eql(expected);
    });

    it('should default isSystemWatch to false', () => {
      const watch = new BaseWatch(props);

      expect(watch.isSystemWatch).to.be(false);
    });

    it('populates all expected fields', () => {
      props.watchStatus = 'bar';
      props.actions = 'baz';
      props.watchErrors = { actions: 'email' };

      const actual = new BaseWatch(props);
      const expected = {
        id: 'my-watch',
        name: 'foo',
        type: 'logging',
        isSystemWatch: false,
        watchStatus: 'bar',
        watchErrors: { actions: 'email' },
        actions: 'baz'
      };

      expect(actual).to.eql(expected);
    });

  });

  describe('watchJson getter method', () => {

    let props;
    beforeEach(() => {
      props = {
        id: 'my-watch',
        name: 'foo',
        type: 'logging'
      };
    });

    it('should return the expected object', () => {
      const watch = new BaseWatch(props);
      const actual = watch.watchJson;
      const expected = {
        metadata: {
          name: 'foo',
          xpack: {
            type: 'logging'
          }
        }
      };

      expect(actual).to.eql(expected);
    });

    it('should only populate the name metadata if a name is defined', () => {
      delete props.name;
      const watch = new BaseWatch(props);
      const actual = watch.watchJson;
      const expected = {
        metadata: {
          xpack: {
            type: props.type
          }
        }
      };

      expect(actual).to.eql(expected);
    });

  });

  describe('getVisualizeQuery getter method', () => {

    it('should return an empty object', () => {
      const watch = new BaseWatch({});
      const actual = watch.getVisualizeQuery();
      const expected = {};

      expect(actual).to.eql(expected);
    });

  });

  describe('formatVisualizeData getter method', () => {

    it('should return an empty array', () => {
      const watch = new BaseWatch({});
      const actual = watch.formatVisualizeData();
      const expected = [];

      expect(actual).to.eql(expected);
    });

  });

  describe('downstreamJson getter method', () => {

    let props;
    beforeEach(() => {
      props = {
        id: 'foo',
        name: 'bar',
        type: 'json',
        watchStatus: {
          downstreamJson: {
            prop1: 'prop1',
            prop2: 'prop2'
          }
        },
        watchErrors: {
          downstreamJson: {
            prop1: 'prop1',
            prop2: 'prop2'
          }
        },
        actions: [{
          downstreamJson: {
            prop1: 'prop3',
            prop2: 'prop4'
          }
        }]
      };
    });

    it('should return a valid object', () => {
      const watch = new BaseWatch(props);

      const actual = watch.downstreamJson;
      const expected = {
        id: props.id,
        name: props.name,
        type: props.type,
        isSystemWatch: false,
        watchStatus: props.watchStatus.downstreamJson,
        watchErrors: props.watchErrors.downstreamJson,
        actions: props.actions.map(a => a.downstreamJson)
      };

      expect(actual).to.eql(expected);
    });

    it('should respect an undefined watchStatus & watchErrors prop', () => {
      delete props.watchStatus;
      delete props.watchErrors;

      const watch = new BaseWatch(props);
      const actual = watch.downstreamJson;

      const expected = {
        id: props.id,
        name: props.name,
        type: props.type,
        isSystemWatch: false,
        watchStatus: undefined,
        watchErrors: undefined,
        actions: props.actions.map(a => a.downstreamJson)
      };

      expect(actual).to.eql(expected);
    });

  });

  describe('upstreamJson getter method', () => {

    let props;
    beforeEach(() => {
      props = {
        id: 'foo',
        name: 'bar',
        type: 'json',
        watchStatus: {
          downstreamJson: {
            prop1: 'prop1',
            prop2: 'prop2'
          }
        },
        actions: [{
          downstreamJson: {
            prop1: 'prop3',
            prop2: 'prop4'
          }
        }]
      };
    });

    it('should return a valid object', () => {
      const watch = new BaseWatch(props);

      const actual = watch.upstreamJson;
      const expected = {
        id: props.id,
        watch: {
          metadata: {
            name: props.name,
            xpack: {
              type: props.type
            }
          }
        }
      };

      expect(actual).to.eql(expected);
    });

  });

  describe('getPropsFromDownstreamJson method', () => {

    let downstreamJson;
    beforeEach(() => {
      actionFromDownstreamJSONMock.resetHistory();

      downstreamJson = {
        id: 'my-watch',
        name: 'foo',
        actions: []
      };
    });

    it('should return a valid props object', () => {
      const props = BaseWatch.getPropsFromDownstreamJson(downstreamJson);
      const actual = Object.keys(props);
      const expected = [
        'id',
        'name',
        'actions'
      ];

      expect(actual).to.eql(expected);
    });

    it('should properly map id and name', () => {
      const props = BaseWatch.getPropsFromDownstreamJson(downstreamJson);
      expect(props.id).to.be('my-watch');
      expect(props.name).to.be('foo');
    });

    it('should return an actions property that is an array', () => {
      const props = BaseWatch.getPropsFromDownstreamJson(downstreamJson);

      expect(Array.isArray(props.actions)).to.be(true);
      expect(props.actions.length).to.be(0);
    });

    it('should call Action.fromUDownstreamJSON for each action', () => {
      const action0 = { type: 'email', id: 'email1' };
      const action1 = { type: 'logging', id: 'logging1' };

      downstreamJson.actions.push(action0);
      downstreamJson.actions.push(action1);

      const props = BaseWatch.getPropsFromDownstreamJson(downstreamJson);

      expect(props.actions.length).to.be(2);
      expect(actionFromDownstreamJSONMock.calledWith(action0)).to.be(true);
      expect(actionFromDownstreamJSONMock.calledWith(action1)).to.be(true);
    });

  });

  describe('getPropsFromUpstreamJson method', () => {

    let upstreamJson;
    beforeEach(() => {
      actionFromUpstreamJSONMock.resetHistory();
      watchStatusFromUpstreamJSONMock.resetHistory();

      upstreamJson = {
        id: 'my-watch',
        type: 'json',
        watchJson: {
          metadata: {
            name: 'foo'
          },
          condition: {
            never: {}
          }
        },
        watchStatusJson: {
          state: {
            active: true
          }
        }
      };
    });

    it(`throws an error if no 'id' property in json`, () => {
      delete upstreamJson.id;

      expect(BaseWatch.getPropsFromUpstreamJson).withArgs(upstreamJson)
        .to.throwError(/must contain an id property/i);
    });

    it(`throws an error if no 'watchJson' property in json`, () => {
      delete upstreamJson.watchJson;

      expect(BaseWatch.getPropsFromUpstreamJson).withArgs(upstreamJson)
        .to.throwError(/must contain a watchJson property/i);
    });

    it(`throws an error if no 'watchStatusJson' property in json`, () => {
      delete upstreamJson.watchStatusJson;

      expect(BaseWatch.getPropsFromUpstreamJson).withArgs(upstreamJson)
        .to.throwError(/must contain a watchStatusJson property/i);
    });

    it(`should ignore unknown watchJson properties`, () => {
      upstreamJson.watchJson = {
        foo: 'foo',
        bar: 'bar',
        trigger: {},
        input: {},
        condition: {},
        actions: {},
        metadata: {},
        transform: {},
        throttle_period: {},
        throttle_period_in_millis: {}
      };

      const props = BaseWatch.getPropsFromUpstreamJson(upstreamJson);
      const actual = Object.keys(props.watchJson);
      const expected = [
        'trigger',
        'input',
        'condition',
        'actions',
        'metadata',
        'transform',
        'throttle_period',
        'throttle_period_in_millis'
      ];

      expect(actual).to.eql(expected);
    });

    it('should return a valid props object', () => {
      const props = BaseWatch.getPropsFromUpstreamJson(upstreamJson);
      const actual = Object.keys(props);
      const expected = [
        'id',
        'name',
        'watchJson',
        'watchStatus',
        'watchErrors',
        'actions'
      ];

      expect(actual).to.eql(expected);
    });

    it('should pull name out of metadata', () => {
      const props = BaseWatch.getPropsFromUpstreamJson(upstreamJson);

      expect(props.name).to.be('foo');
    });

    it('should return an actions property that is an array', () => {
      const props = BaseWatch.getPropsFromUpstreamJson(upstreamJson);

      expect(Array.isArray(props.actions)).to.be(true);
      expect(props.actions.length).to.be(0);
    });

    it('should call Action.fromUpstreamJson for each action', () => {
      upstreamJson.watchJson.actions = {
        'my-logging-action': {
          'logging': {
            'text': 'foo'
          }
        },
        'my-unknown-action': {
          'foobar': {}
        }
      };

      const props = BaseWatch.getPropsFromUpstreamJson(upstreamJson);

      expect(props.actions.length).to.be(2);
      expect(actionFromUpstreamJSONMock.calledWith({
        id: 'my-logging-action',
        actionJson: {
          'logging': {
            'text': 'foo'
          }
        }
      })).to.be(true);
      expect(actionFromUpstreamJSONMock.calledWith({
        id: 'my-unknown-action',
        actionJson: {
          'foobar': {}
        }
      })).to.be(true);
    });

    it('should call WatchStatus.fromUpstreamJson for the watch status', () => {
      BaseWatch.getPropsFromUpstreamJson(upstreamJson);

      expect(watchStatusFromUpstreamJSONMock.calledWith({
        id: 'my-watch',
        watchStatusJson: {
          state: {
            active: true
          }
        },
        watchErrors: {
          foo: 'bar'
        }
      })).to.be(true);
    });

  });

});
