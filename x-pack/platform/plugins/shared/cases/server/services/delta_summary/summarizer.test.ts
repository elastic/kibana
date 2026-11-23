/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, httpServerMock } from '@kbn/core/server/mocks';
import { MessageRole } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createDeltaSummarizer } from './summarizer';

describe('createDeltaSummarizer', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();
  const chatComplete = jest.fn();
  const getDefaultConnector = jest.fn();
  const inference = {
    getDefaultConnector,
    getClient: jest.fn(() => ({ chatComplete })),
  } as unknown as InferenceServerStart;

  beforeEach(() => {
    jest.clearAllMocks();
    getDefaultConnector.mockResolvedValue({ connectorId: 'eis-default' });
    chatComplete.mockResolvedValue({ content: 'A summary [1].' });
  });

  describe('isAvailable', () => {
    it('is true when a default connector exists', async () => {
      await expect(
        createDeltaSummarizer({ inference, request, logger }).isAvailable()
      ).resolves.toBe(true);
    });

    it('is false when no default connector exists', async () => {
      getDefaultConnector.mockResolvedValue(undefined);

      await expect(
        createDeltaSummarizer({ inference, request, logger }).isAvailable()
      ).resolves.toBe(false);
    });

    it('is false when loading the default connector fails', async () => {
      getDefaultConnector.mockRejectedValue(new Error('boom'));

      await expect(
        createDeltaSummarizer({ inference, request, logger }).isAvailable()
      ).resolves.toBe(false);
    });
  });

  describe('complete', () => {
    it('asks the default model with a system prompt and the user text', async () => {
      const text = await createDeltaSummarizer({ inference, request, logger }).complete({
        system: 'system text',
        user: 'user text',
      });

      expect(text).toBe('A summary [1].');
      expect(chatComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'eis-default',
          system: 'system text',
          messages: [{ role: MessageRole.User, content: 'user text' }],
          temperature: 0,
        })
      );
    });

    it('throws when no default connector exists', async () => {
      getDefaultConnector.mockResolvedValue(undefined);

      await expect(
        createDeltaSummarizer({ inference, request, logger }).complete({ system: 's', user: 'u' })
      ).rejects.toThrow('No default inference connector is available');
    });
  });
});
