/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { InferenceConnector } from '@kbn/inference-common';
import {
  getConnectorByIdAndTaskType,
  getConnectorListByTaskType,
  isChatCompletionFeature,
} from './connectors_by_task_type';

const connector = (connectorId: string) => ({ connectorId } as InferenceConnector);

describe('connectors by task type', () => {
  const request = httpServerMock.createKibanaRequest();
  const inference = {
    getConnectorList: jest.fn(),
    getConnectorById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConnectorListByTaskType', () => {
    it('lists chat models when no task type is given', async () => {
      inference.getConnectorList.mockResolvedValue([connector('chat-1')]);

      await expect(getConnectorListByTaskType(inference, request)).resolves.toEqual([
        connector('chat-1'),
      ]);
      expect(inference.getConnectorList).toHaveBeenCalledWith(request);
    });

    it('lists the inference endpoints of another task type', async () => {
      inference.getConnectorList.mockResolvedValue([connector('decision-1')]);

      await getConnectorListByTaskType(inference, request, 'decision');

      expect(inference.getConnectorList).toHaveBeenCalledWith(request, { taskType: 'decision' });
    });
  });

  describe('getConnectorByIdAndTaskType', () => {
    it('looks a chat model up by id', async () => {
      inference.getConnectorById.mockResolvedValue(connector('chat-1'));

      await expect(
        getConnectorByIdAndTaskType(inference, 'chat-1', request, 'chat_completion')
      ).resolves.toEqual(connector('chat-1'));
      expect(inference.getConnectorById).toHaveBeenCalledWith('chat-1', request);
      expect(inference.getConnectorList).not.toHaveBeenCalled();
    });

    it('finds a model of another task type among the endpoints of that task type', async () => {
      inference.getConnectorList.mockResolvedValue([connector('decision-1')]);

      await expect(
        getConnectorByIdAndTaskType(inference, 'decision-1', request, 'decision')
      ).resolves.toEqual(connector('decision-1'));
      expect(inference.getConnectorById).not.toHaveBeenCalled();
    });

    it('throws a 404 when no endpoint of that task type has the id', async () => {
      inference.getConnectorList.mockResolvedValue([connector('decision-1')]);

      await expect(
        getConnectorByIdAndTaskType(inference, 'chat-1', request, 'decision')
      ).rejects.toMatchObject({ meta: { status: 404 } });
    });
  });

  describe('isChatCompletionFeature', () => {
    it('is true for a chat completion feature and for an unregistered one', () => {
      expect(isChatCompletionFeature({ taskType: 'chat_completion' })).toBe(true);
      expect(isChatCompletionFeature(undefined)).toBe(true);
    });

    it('is false for a feature of another task type', () => {
      expect(isChatCompletionFeature({ taskType: 'decision' })).toBe(false);
    });
  });
});
