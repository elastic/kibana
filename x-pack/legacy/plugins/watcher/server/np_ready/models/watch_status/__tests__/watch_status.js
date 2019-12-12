/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { WatchStatus } from '../watch_status';
import { ACTION_STATES, WATCH_STATES, WATCH_STATE_COMMENTS } from '../../../../../common/constants';
import moment from 'moment';

describe('watch_status', () => {

  describe('WatchStatus', () => {

    describe('fromUpstreamJson factory method', () => {

      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-watch',
          watchStatusJson: {
            state: {
              active: true
            },
            last_checked: '2017-03-02T14:25:31.139Z',
            last_met_condition: '2017-07-05T14:25:31.139Z',
            actions: {
              foo: {},
              bar: {}
            }
          }
        };
      });

      it(`throws an error if no 'id' property in json`, () => {
        delete upstreamJson.id;
        expect(WatchStatus.fromUpstreamJson).withArgs(upstreamJson)
          .to.throwError(/must contain an id property/i);
      });

      it(`throws an error if no 'watchStatusJson' property in json`, () => {
        delete upstreamJson.watchStatusJson;
        expect(WatchStatus.fromUpstreamJson).withArgs(upstreamJson)
          .to.throwError(/must contain a watchStatusJson property/i);
      });

      it('returns correct WatchStatus instance', () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);

        expect(watchStatus.id).to.be(upstreamJson.id);
        expect(watchStatus.watchStatusJson).to.eql(upstreamJson.watchStatusJson);
        expect(watchStatus.isActive).to.eql(true);
        expect(watchStatus.lastChecked).to.eql(moment(upstreamJson.watchStatusJson.last_checked));
        expect(watchStatus.lastMetCondition).to.eql(moment(upstreamJson.watchStatusJson.last_met_condition));
        expect(watchStatus.actionStatuses.length).to.be(2);

        expect(watchStatus.actionStatuses[0].constructor.name).to.be('ActionStatus');
        expect(watchStatus.actionStatuses[1].constructor.name).to.be('ActionStatus');
      });

    });

    describe('lastFired getter method', () => {

      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-watch',
          watchStatusJson: {
            actions: {
              foo: {
                last_execution: {
                  timestamp: '2017-07-05T00:00:00.000Z'
                }
              },
              bar: {
                last_execution: {
                  timestamp: '2025-07-05T00:00:00.000Z'
                }
              },
              baz: {}
            }
          }
        };
      });

      it(`returns the latest lastExecution from it's actions`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);
        expect(watchStatus.lastFired).to
          .eql(moment(upstreamJson.watchStatusJson.actions.bar.last_execution.timestamp));
      });

    });

    describe('comment getter method', () => {

      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-watch',
          watchStatusJson: {
            state: {
              active: true
            }
          }
        };
      });

      it(`correctly calculates WATCH_STATE_COMMENTS.OK there are no actions`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);
        watchStatus.isActive = true;
        expect(watchStatus.comment).to.be(WATCH_STATE_COMMENTS.OK);
      });

      it(`correctly calculates WATCH_STATE_COMMENTS.PARTIALLY_THROTTLED`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.THROTTLED },
          { state: ACTION_STATES.FIRING },
          { state: ACTION_STATES.OK }
        ];

        expect(watchStatus.comment).to.be(WATCH_STATE_COMMENTS.PARTIALLY_THROTTLED);
      });

      it(`correctly calculates WATCH_STATE_COMMENTS.THROTTLED`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.THROTTLED },
          { state: ACTION_STATES.THROTTLED },
          { state: ACTION_STATES.THROTTLED }
        ];

        expect(watchStatus.comment).to.be(WATCH_STATE_COMMENTS.THROTTLED);
      });

      it(`correctly calculates WATCH_STATE_COMMENTS.PARTIALLY_ACKNOWLEDGED`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.ACKNOWLEDGED },
          { state: ACTION_STATES.OK },
          { state: ACTION_STATES.THROTTLED },
          { state: ACTION_STATES.FIRING }
        ];

        expect(watchStatus.comment).to.be(WATCH_STATE_COMMENTS.PARTIALLY_ACKNOWLEDGED);
      });

      it(`correctly calculates WATCH_STATE_COMMENTS.ACKNOWLEDGED`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.ACKNOWLEDGED },
          { state: ACTION_STATES.ACKNOWLEDGED },
          { state: ACTION_STATES.ACKNOWLEDGED }
        ];

        expect(watchStatus.comment).to.be(WATCH_STATE_COMMENTS.ACKNOWLEDGED);
      });

      it(`correctly calculates WATCH_STATE_COMMENTS.FAILING`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.OK },
          { state: ACTION_STATES.ACKNOWLEDGED },
          { state: ACTION_STATES.THROTTLED },
          { state: ACTION_STATES.FIRING },
          { state: ACTION_STATES.ERROR }
        ];

        expect(watchStatus.comment).to.be(WATCH_STATE_COMMENTS.FAILING);
      });

      it(`correctly calculates WATCH_STATE_COMMENTS.OK when watch is inactive`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);
        watchStatus.isActive = false;

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.OK },
          { state: ACTION_STATES.ACKNOWLEDGED },
          { state: ACTION_STATES.THROTTLED },
          { state: ACTION_STATES.FIRING },
          { state: ACTION_STATES.ERROR }
        ];

        expect(watchStatus.comment).to.be(WATCH_STATE_COMMENTS.OK);
      });

    });

    describe('state getter method', () => {

      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-watch',
          watchStatusJson: {
            state: {
              active: true
            }
          }
        };
      });

      it(`correctly calculates WATCH_STATES.OK there are no actions`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);
        watchStatus.isActive = true;
        expect(watchStatus.state).to.be(WATCH_STATES.OK);
      });

      it(`correctly calculates WATCH_STATES.FIRING`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.OK },
          { state: ACTION_STATES.FIRING }
        ];
        expect(watchStatus.state).to.be(WATCH_STATES.FIRING);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.OK },
          { state: ACTION_STATES.FIRING },
          { state: ACTION_STATES.THROTTLED }
        ];
        expect(watchStatus.state).to.be(WATCH_STATES.FIRING);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.OK },
          { state: ACTION_STATES.FIRING },
          { state: ACTION_STATES.THROTTLED },
          { state: ACTION_STATES.ACKNOWLEDGED }
        ];
        expect(watchStatus.state).to.be(WATCH_STATES.FIRING);
      });

      it(`correctly calculates WATCH_STATES.ERROR`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.OK },
          { state: ACTION_STATES.FIRING },
          { state: ACTION_STATES.THROTTLED },
          { state: ACTION_STATES.ACKNOWLEDGED },
          { state: ACTION_STATES.ERROR }
        ];

        expect(watchStatus.state).to.be(WATCH_STATES.ERROR);
      });

      it('correctly calculates WATCH_STATE.CONFIG_ERROR', () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.OK },
          { state: ACTION_STATES.CONFIG_ERROR }
        ];

        expect(watchStatus.state).to.be(WATCH_STATES.CONFIG_ERROR);
      });

      it(`correctly calculates WATCH_STATES.DISABLED when watch is inactive`, () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);
        watchStatus.isActive = false;

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.OK },
          { state: ACTION_STATES.FIRING },
          { state: ACTION_STATES.THROTTLED },
          { state: ACTION_STATES.ACKNOWLEDGED },
          { state: ACTION_STATES.ERROR }
        ];

        expect(watchStatus.state).to.be(WATCH_STATES.DISABLED);
      });

    });

    describe('downstreamJson getter method', () => {

      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-watch',
          watchStatusJson: {
            state: {
              active: true
            },
            last_checked: '2017-03-02T14:25:31.139Z',
            last_met_condition: '2017-07-05T14:25:31.139Z',
            actions: {
              foo: {},
              bar: {}
            }
          }
        };
      });

      it('returns correct downstream JSON object', () => {
        const watchStatus = WatchStatus.fromUpstreamJson(upstreamJson);
        watchStatus.actionStatuses = [
          { id: 'foo', state: ACTION_STATES.OK },
          { id: 'bar', state: ACTION_STATES.OK }
        ];

        const actual = watchStatus.downstreamJson;

        expect(actual.id).to.be(watchStatus.id);
        expect(actual.state).to.be(watchStatus.state);
        expect(actual.comment).to.be(watchStatus.comment);
        expect(actual.isActive).to.be(watchStatus.isActive);
        expect(actual.lastChecked).to.be(watchStatus.lastChecked);
        expect(actual.lastMetCondition).to.be(watchStatus.lastMetCondition);
        expect(actual.lastFired).to.be(watchStatus.lastFired);
        expect(actual.actionStatuses.length).to.be(2);
      });

    });

  });

});
