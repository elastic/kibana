/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { significantEventsPrompt } from '@kbn/streams-ai/src/significant_events/prompt';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { descriptionPrompt } from '@kbn/streams-ai/src/description/prompt';
import { systemsPrompt } from '@kbn/streams-ai/src/systems/prompt';
import summarizeQueriesPrompt from '../../significant_events/insights/prompts/summarize_queries/system_prompt.text';
import summarizeStreamsPrompt from '../../significant_events/insights/prompts/summarize_streams/system_prompt.text';
import { PromptsConfigService } from './prompts_config_service';
import { streamsPromptsSOType } from './prompts_config';

describe('PromptsConfigService', () => {
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let loggerMock: MockedLogger;
  let service: PromptsConfigService;

  beforeEach(() => {
    soClientMock = savedObjectsClientMock.create();
    loggerMock = loggingSystemMock.createLogger();
    service = new PromptsConfigService({ soClient: soClientMock, logger: loggerMock });
  });

  describe('getPrompt', () => {
    it('returns default prompts when saved object does not exist', async () => {
      const notFoundError = new Error('Not Found') as Error & { output?: { statusCode: number } };
      notFoundError.output = { statusCode: 404 };
      soClientMock.get.mockRejectedValue(notFoundError);

      const result = await service.getPrompt();

      expect(result).toEqual({
        featurePromptOverride: featuresPrompt,
        significantEventsPromptOverride: significantEventsPrompt,
        descriptionPromptOverride: descriptionPrompt,
        systemsPromptOverride: systemsPrompt,
        summarizeQueriesPromptOverride: summarizeQueriesPrompt,
        summarizeStreamsPromptOverride: summarizeStreamsPrompt,
      });
    });

    it('returns saved prompt values when saved object exists', async () => {
      const customPrompt = 'Custom override prompt';
      soClientMock.get.mockResolvedValue({
        id: 'streams-prompts-config-id',
        type: streamsPromptsSOType,
        references: [],
        attributes: {
          featurePromptOverride: customPrompt,
          summarizeQueriesPromptOverride: 'Custom queries prompt',
          summarizeStreamsPromptOverride: 'Custom streams prompt',
        },
      });

      const result = await service.getPrompt();

      expect(result).toEqual({
        featurePromptOverride: customPrompt,
        significantEventsPromptOverride: significantEventsPrompt,
        descriptionPromptOverride: descriptionPrompt,
        systemsPromptOverride: systemsPrompt,
        summarizeQueriesPromptOverride: 'Custom queries prompt',
        summarizeStreamsPromptOverride: 'Custom streams prompt',
      });
    });

    it('falls back to defaults for empty override fields', async () => {
      soClientMock.get.mockResolvedValue({
        id: 'streams-prompts-config-id',
        type: streamsPromptsSOType,
        references: [],
        attributes: {
          featurePromptOverride: '',
          summarizeQueriesPromptOverride: undefined,
        },
      });

      const result = await service.getPrompt();

      expect(result.featurePromptOverride).toBe(featuresPrompt);
      expect(result.summarizeQueriesPromptOverride).toBe(summarizeQueriesPrompt);
      expect(result.summarizeStreamsPromptOverride).toBe(summarizeStreamsPrompt);
    });

    it('propagates non-404 errors', async () => {
      const serverError = new Error('Internal Server Error');
      soClientMock.get.mockRejectedValue(serverError);

      await expect(service.getPrompt()).rejects.toThrow('Internal Server Error');
    });
  });

  describe('upsertPrompt', () => {
    it('merges new prompt values with existing ones', async () => {
      // Mock getPrompt to return existing values
      soClientMock.get.mockResolvedValue({
        id: 'streams-prompts-config-id',
        type: streamsPromptsSOType,
        references: [],
        attributes: {
          featurePromptOverride: 'Existing feature prompt',
        },
      });

      soClientMock.create.mockResolvedValue({
        id: 'streams-prompts-config-id',
        type: streamsPromptsSOType,
        references: [],
        attributes: {
          featurePromptOverride: 'Existing feature prompt',
          summarizeQueriesPromptOverride: 'New queries prompt',
        },
      });

      const result = await service.upsertPrompt({
        summarizeQueriesPromptOverride: 'New queries prompt',
      });

      expect(soClientMock.create).toHaveBeenCalledWith(
        streamsPromptsSOType,
        expect.objectContaining({
          featurePromptOverride: 'Existing feature prompt',
          summarizeQueriesPromptOverride: 'New queries prompt',
        }),
        expect.objectContaining({
          id: 'streams-prompts-config-id',
          overwrite: true,
        })
      );

      expect(result).toEqual({
        featurePromptOverride: 'Existing feature prompt',
        summarizeQueriesPromptOverride: 'New queries prompt',
      });
    });
  });

  describe('resetPrompts', () => {
    it('deletes the prompts saved object', async () => {
      soClientMock.delete.mockResolvedValue({});

      await service.resetPrompts();

      expect(soClientMock.delete).toHaveBeenCalledWith(
        streamsPromptsSOType,
        'streams-prompts-config-id'
      );
    });
  });
});
