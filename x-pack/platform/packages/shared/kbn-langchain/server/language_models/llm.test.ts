/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';

import { ActionsClientLlm } from './llm';
import { mockActionResponse } from './mocks';
import { getDefaultArguments } from '..';
import { DEFAULT_TIMEOUT } from './constants';

const connectorId = 'mock-connector-id';

const actionsClient = actionsClientMock.create();

const mockLogger = loggerMock.create();

const prompt = 'Do you know my name?';

describe('ActionsClientLlm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actionsClient.execute.mockImplementation(
      jest.fn().mockImplementation(() => ({
        data: mockActionResponse,
        status: 'ok',
      }))
    );
  });

  describe('_llmType', () => {
    it('returns the expected LLM type', () => {
      const actionsClientLlm = new ActionsClientLlm({
        actionsClient,
        connectorId,
        logger: mockLogger,
      });

      expect(actionsClientLlm._llmType()).toEqual('ActionsClientLlm');
    });

    it('returns the expected LLM type when overridden', () => {
      const actionsClientLlm = new ActionsClientLlm({
        actionsClient,
        connectorId,
        llmType: 'special-llm-type',
        logger: mockLogger,
      });

      expect(actionsClientLlm._llmType()).toEqual('special-llm-type');
    });
  });

  describe('_call', () => {
    it('executes with the expected arguments when llmType is not inference', async () => {
      const actionsClientLlm = new ActionsClientLlm({
        actionsClient,
        connectorId,
        logger: mockLogger,
      });
      await actionsClientLlm._call(prompt);
      expect(actionsClient.execute).toHaveBeenCalledWith({
        actionId: 'mock-connector-id',
        params: {
          subAction: 'invokeAI',
          subActionParams: {
            messages: [
              {
                content: 'Do you know my name?',
                role: 'user',
              },
            ],
            ...getDefaultArguments(),
            timeout: DEFAULT_TIMEOUT,
          },
        },
      });
    });
    it('executes with the expected arguments when llmType is inference', async () => {
      actionsClient.execute.mockImplementation(
        jest.fn().mockImplementation(() => ({
          data: {
            choices: [
              {
                message: { content: mockActionResponse.message },
              },
            ],
          },
          status: 'ok',
        }))
      );
      const actionsClientLlm = new ActionsClientLlm({
        actionsClient,
        connectorId,
        logger: mockLogger,
        llmType: 'inference',
      });
      const result = await actionsClientLlm._call(prompt);
      expect(actionsClient.execute).toHaveBeenCalledWith({
        actionId: 'mock-connector-id',
        params: {
          subAction: 'unified_completion',
          subActionParams: {
            body: {
              messages: [
                {
                  content: 'Do you know my name?',
                  role: 'user',
                },
              ],
            },
          },
        },
      });
      expect(result).toEqual(mockActionResponse.message);
    });
    it('returns the expected content when _call is invoked', async () => {
      const actionsClientLlm = new ActionsClientLlm({
        actionsClient,
        connectorId,
        logger: mockLogger,
      });

      const result = await actionsClientLlm._call(prompt);
      expect(result).toEqual(mockActionResponse.message);
    });

    it('rejects with the expected error when the action result status is error', async () => {
      actionsClient.execute.mockImplementation(() => {
        throw new Error(
          'ActionsClientLlm: action result status is error: action-result-message - action-result-service-message'
        );
      });
      const actionsClientLlm = new ActionsClientLlm({
        actionsClient,
        connectorId,
        logger: mockLogger,
      });

      await expect(actionsClientLlm._call(prompt)).rejects.toThrowError(
        'ActionsClientLlm: action result status is error: action-result-message - action-result-service-message'
      );
    });

    it('rejects with the expected error the message has invalid content', async () => {
      const invalidContent = { message: 1234 };

      actionsClient.execute.mockImplementation(
        jest.fn().mockResolvedValue({
          data: invalidContent,
          status: 'ok',
        })
      );

      const actionsClientLlm = new ActionsClientLlm({
        actionsClient,
        connectorId,
        logger: mockLogger,
      });

      await expect(actionsClientLlm._call(prompt)).rejects.toThrowError(
        'ActionsClientLlm: content should be a string, but it had an unexpected type: number'
      );
    });
  });
});
