/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ACTION_STATES } from '../../../common/constants';
import { ActionStatusModelEs } from '../../../common/types';
import { buildServerActionStatusModel, buildClientActionStatusModel } from './action_status_model';

describe('ActionStatusModel', () => {
  describe('buildServerActionStatusModel', () => {
    let upstreamJson: ActionStatusModelEs;
    beforeEach(() => {
      upstreamJson = {
        id: 'my-action',
        lastCheckedRawFormat: '2017-03-01T20:55:49.679Z',
        actionStatusJson: {
          ack: {
            timestamp: '2017-03-01T20:56:58.442Z',
            state: 'acked',
          },
          last_execution: {
            timestamp: '2017-03-01T20:55:49.679Z',
            successful: true,
            reason: 'reasons',
          },
          last_throttle: {
            timestamp: '2017-03-01T20:55:49.679Z',
            reason: 'reasons',
          },
          last_successful_execution: {
            timestamp: '2017-03-01T20:55:49.679Z',
            successful: true,
          },
        },
      };
    });

    // TODO: Remove once all consumers and upstream dependencies are converted to TS.
    it(`throws an error if no 'id' property in json`, () => {
      expect(() => {
        // @ts-ignore
        buildServerActionStatusModel({});
      }).toThrow('JSON argument must contain an "id" property');
    });

    // TODO: Remove once all consumers and upstream dependencies are converted to TS.
    it(`throws an error if no 'actionStatusJson' property in json`, () => {
      expect(() => {
        // @ts-ignore
        buildServerActionStatusModel({ id: 'test' });
      }).toThrow('JSON argument must contain an "actionStatusJson" property');
    });

    it('returns correct ActionStatus instance', () => {
      const serverActionStatusModel = buildServerActionStatusModel({
        ...upstreamJson,
        errors: { foo: 'bar' },
      });

      expect(serverActionStatusModel.id).toBe(upstreamJson.id);
      expect(serverActionStatusModel.lastAcknowledged).toEqual(
        moment(upstreamJson.actionStatusJson.ack.timestamp)
      );
      expect(serverActionStatusModel.lastExecution).toEqual(
        moment(upstreamJson.actionStatusJson.last_execution?.timestamp)
      );
      expect(serverActionStatusModel.isLastExecutionSuccessful).toEqual(
        upstreamJson.actionStatusJson.last_execution?.successful
      );
      expect(serverActionStatusModel.lastExecutionReason).toBe(
        upstreamJson.actionStatusJson.last_execution?.reason
      );
      expect(serverActionStatusModel.lastThrottled).toEqual(
        moment(upstreamJson.actionStatusJson.last_throttle?.timestamp)
      );
      expect(serverActionStatusModel.lastSuccessfulExecution).toEqual(
        moment(upstreamJson.actionStatusJson.last_successful_execution?.timestamp)
      );
      expect(serverActionStatusModel.errors).toEqual({ foo: 'bar' });
    });
  });

  describe('buildClientActionStatusModel', () => {
    let upstreamJson: ActionStatusModelEs;
    beforeEach(() => {
      upstreamJson = {
        id: 'my-action',
        lastCheckedRawFormat: '2017-03-01T20:55:49.679Z',
        actionStatusJson: {
          ack: {
            timestamp: '2017-03-01T20:56:58.442Z',
            state: 'acked',
          },
          last_execution: {
            timestamp: '2017-03-01T20:55:49.679Z',
            successful: true,
            reason: 'reasons',
          },
          last_throttle: {
            timestamp: '2017-03-01T20:55:49.679Z',
            reason: 'reasons',
          },
          last_successful_execution: {
            timestamp: '2017-03-01T20:55:49.679Z',
            successful: true,
          },
        },
      };
    });

    it('returns correct JSON for client', () => {
      const serverActionStatusModel = buildServerActionStatusModel(upstreamJson);
      const clientActionStatusModel = buildClientActionStatusModel(serverActionStatusModel);

      // These properties should be transcribed 1:1.
      expect(clientActionStatusModel.id).toBe(serverActionStatusModel.id);
      expect(clientActionStatusModel.lastAcknowledged).toBe(
        serverActionStatusModel.lastAcknowledged
      );
      expect(clientActionStatusModel.lastThrottled).toBe(serverActionStatusModel.lastThrottled);
      expect(clientActionStatusModel.lastExecution).toBe(serverActionStatusModel.lastExecution);
      expect(clientActionStatusModel.isLastExecutionSuccessful).toBe(
        serverActionStatusModel.isLastExecutionSuccessful
      );
      expect(clientActionStatusModel.lastExecutionReason).toBe(
        serverActionStatusModel.lastExecutionReason
      );
      expect(clientActionStatusModel.lastSuccessfulExecution).toBe(
        serverActionStatusModel.lastSuccessfulExecution
      );

      // These properties are derived when clientActionStatusModel is created.
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.ACKNOWLEDGED);
      expect(clientActionStatusModel.isAckable).toBe(false);
    });
  });
});
