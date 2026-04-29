/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { FleetActionsClientError, FleetActionsError } from '../../../common/errors';
import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../app_context';
import { auditLoggingService } from '../audit_logging';

import {
  generateFleetAction,
  generateFleetActionResult,
  generateFleetActionsBulkCreateESResponse,
  generateFleetActionsESResponse,
  generateFleetActionsResultsESResponse,
} from './mocks';

import { FleetActionsClient } from './client';

jest.mock('../audit_logging');
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

describe('actions', () => {
  let fleetActionsClient: FleetActionsClient;
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;

  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    esClientMock = elasticsearchServiceMock.createInternalClient();
    fleetActionsClient = new FleetActionsClient(esClientMock, 'foo');
  });

  afterEach(() => {
    appContextService.stop();
  });

  describe('create()', () => {
    afterEach(() => {
      mockedAuditLoggingService.writeCustomAuditLog.mockReset();
    });
    it('should create an action', async () => {
      const action = generateFleetAction({ action_id: '1', input_type: 'foo' });
      expect(await fleetActionsClient.create(action)).toEqual(action);
      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `User created Fleet action [id=1, user_id=${action.user_id}, input_type=foo]`,
      });
    });
    it('should throw error when action does not match package name', async () => {
      const action = generateFleetAction({ action_id: '1', input_type: 'bar' });
      await expect(async () => await fleetActionsClient.create(action)).rejects.toBeInstanceOf(
        FleetActionsClientError
      );
      expect(mockedAuditLoggingService.writeCustomAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('bulkCreate()', () => {
    afterEach(() => {
      mockedAuditLoggingService.writeCustomAuditLog.mockReset();
    });

    it('should bulk create actions', async () => {
      const actions = [
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
      ].map(generateFleetAction);
      esClientMock.bulk.mockResolvedValue(generateFleetActionsBulkCreateESResponse(actions));

      expect(await fleetActionsClient.bulkCreate(actions)).toEqual({
        status: 'success',
        items: actions.map((action) => ({
          id: action.action_id,
          status: 'success',
        })),
      });

      expect(mockedAuditLoggingService.writeCustomAuditLog).toBeCalledTimes(2);
      expect(mockedAuditLoggingService.writeCustomAuditLog).lastCalledWith({
        message: `User created Fleet action [id=${actions[1].action_id}, user_id=${actions[1].user_id}, input_type=foo]`,
      });
    });

    it('should report errored documents', async () => {
      const successActions = [
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
      ].map(generateFleetAction);
      const failedActions = [
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
      ].map(generateFleetAction);

      esClientMock.bulk.mockResolvedValue(
        generateFleetActionsBulkCreateESResponse(successActions, failedActions, true)
      );

      expect(await fleetActionsClient.bulkCreate([...successActions, ...failedActions])).toEqual({
        status: 'mixed',
        items: successActions
          .map((action) => ({
            id: action.action_id,
            status: 'success',
          }))
          .concat(
            failedActions.map((action) => ({
              id: action.action_id,
              status: 'error',
            }))
          ),
      });

      expect(mockedAuditLoggingService.writeCustomAuditLog).toBeCalledTimes(2);
      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenNthCalledWith(1, {
        message: `User created Fleet action [id=${successActions[0].action_id}, user_id=elastic, input_type=foo]`,
      });
      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenNthCalledWith(2, {
        message: `User created Fleet action [id=${successActions[1].action_id}, user_id=elastic, input_type=foo]`,
      });
    });
    it('should throw error for bulk creation on package mismatch on any given set of actions', async () => {
      const actions = [
        {
          action_id: '1',
          input_type: 'foo',
        },
        {
          action_id: '2',
          input_type: 'bar',
        },
      ].map(generateFleetAction);

      await expect(async () => await fleetActionsClient.bulkCreate(actions)).rejects.toBeInstanceOf(
        FleetActionsClientError
      );
      expect(mockedAuditLoggingService.writeCustomAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('getActionsByIds()', () => {
    it('should get an action by id', async () => {
      const actions = [generateFleetAction({ action_id: '1', input_type: 'foo' })];
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      expect(await fleetActionsClient.getActionsByIds(['1'])).toEqual({
        items: actions,
        total: actions.length,
      });
    });

    it('should reject when trying to get an action from a different package', async () => {
      esClientMock.search.mockResponse(
        generateFleetActionsESResponse([generateFleetAction({ action_id: '3', input_type: 'bar' })])
      );

      await expect(
        async () => await fleetActionsClient.getActionsByIds(['3'])
      ).rejects.toBeInstanceOf(FleetActionsClientError);
    });
  });

  describe('getActionsWithKuery()', () => {
    it('should get actions with given kuery', async () => {
      const actions = [
        { action_id: '1', agents: ['agent-1'], input_type: 'foo' },
        { action_id: '2', agents: ['agent-2'], input_type: 'foo' },
      ].map(generateFleetAction);
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      expect(
        await fleetActionsClient.getActionsWithKuery(
          'action_id: "1" or action_id: "2" and input_type: "endpoint" and "@timestamp" <= "now" and "@timestamp" >= "now-2d"'
        )
      ).toEqual({ items: actions, total: actions.length });
    });

    it('should reject when given kuery results do not match package name', async () => {
      const actions = [
        { action_id: '1', agents: ['agent-1'], input_type: 'foo' },
        { action_id: '2', agents: ['agent-2'], input_type: 'bar' },
      ].map(generateFleetAction);
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      await expect(
        async () => await fleetActionsClient.getActionsWithKuery('action_id: "1" or action_id: "2"')
      ).rejects.toBeInstanceOf(FleetActionsClientError);
    });

    it('should reject when given kuery uses un-allowed fields', async () => {
      const actions = [
        { action_id: '1', agents: ['agent-1'], input_type: 'foo' },
        { action_id: '2', agents: ['agent-2'], input_type: 'foo' },
      ].map(generateFleetAction);
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      await expect(
        async () =>
          await fleetActionsClient.getActionsWithKuery(
            'action_id: "1" or expiration: "2023-06-21T10:55:36.481Z"'
          )
      ).rejects.toBeInstanceOf(FleetActionsError);
    });
  });

  describe('getResultsByIds()', () => {
    it('should get action results by action ids', async () => {
      const results = [
        { action_id: 'action-id-1', agent_id: 'agent-1', action_input_type: 'foo' },
        { action_id: 'action-id-2', agent_id: 'agent-2', action_input_type: 'foo' },
      ].map(generateFleetActionResult);
      esClientMock.search.mockResponse(generateFleetActionsResultsESResponse(results));

      expect(await fleetActionsClient.getResultsByIds(['action-id-1', 'action-id-2'])).toEqual({
        items: results,
        total: 2,
      });
    });

    it('should reject when given package name does not match result', async () => {
      const results = [
        { action_id: 'action-id-21', agent_id: 'agent-1', action_input_type: 'foo' },
        { action_id: 'action-id-23', agent_id: 'agent-2', action_input_type: 'bar' },
      ].map(generateFleetActionResult);
      esClientMock.search.mockResponse(generateFleetActionsResultsESResponse(results));
      await expect(
        async () => await fleetActionsClient.getResultsByIds(['action-id-1', 'action-id-2'])
      ).rejects.toBeInstanceOf(FleetActionsClientError);
    });
  });

  describe('getResultsWithKuery()', () => {
    it('should get action results with kuery', async () => {
      const results = [
        { action_id: 'action-id-21', agent_id: 'agent-1', action_input_type: 'foo' },
        { action_id: 'action-id-23', agent_id: 'agent-2', action_input_type: 'foo' },
      ].map(generateFleetActionResult);
      esClientMock.search.mockResponse(generateFleetActionsResultsESResponse(results));

      expect(
        await fleetActionsClient.getResultsWithKuery(
          'action_id: "action-id-21" or action_id: "action-id-23"'
        )
      ).toEqual({ items: results, total: results.length });
    });

    it('should reject when given package name does not match result', async () => {
      const results = [
        { action_id: 'action-id-21', agent_id: 'agent-1', action_input_type: 'foo' },
        { action_id: 'action-id-23', agent_id: 'agent-2', action_input_type: 'bar' },
      ].map(generateFleetActionResult);
      esClientMock.search.mockResponse(generateFleetActionsResultsESResponse(results));
      await expect(
        async () =>
          await fleetActionsClient.getResultsWithKuery(
            'action_id: "action-id-21" or action_id: "action-id-23"'
          )
      ).rejects.toBeInstanceOf(FleetActionsClientError);
    });

    it('should reject when given kuery uses un-allowed fields', async () => {
      const results = [
        { action_id: 'action-id-21', agent_id: 'agent-1', action_input_type: 'foo' },
        { action_id: 'action-id-23', agent_id: 'agent-2', action_input_type: 'foo' },
      ].map(generateFleetActionResult);
      esClientMock.search.mockResponse(generateFleetActionsResultsESResponse(results));
      await expect(
        async () =>
          await fleetActionsClient.getResultsWithKuery(
            'action_id: "action-id-21" or action_input_type: "osquery"'
          )
      ).rejects.toBeInstanceOf(FleetActionsError);
    });
  });
});
