/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { anonymizeRecords } from './anonymize_records';
import { AnonymizationRule } from '@kbn/inference-common';
import { MlInferenceResponseResult } from '@elastic/elasticsearch/lib/api/types';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { RegexWorkerService } from './regex_worker_service';
import { AnonymizationWorkerConfig } from '../../config';
const mockEsClient = {
  ml: {
    inferTrainedModel: jest.fn(),
  },
} as any;

const setupMockResponse = (entitiesPerDoc: MlInferenceResponseResult[]) => {
  mockEsClient.ml.inferTrainedModel.mockResolvedValue({
    inference_results: entitiesPerDoc,
  });
};
const nerRule: AnonymizationRule = {
  type: 'NER',
  enabled: true,
  modelId: 'model-1',
};
const nerRule2: AnonymizationRule = {
  type: 'NER',
  enabled: true,
  modelId: 'model-2',
};
const regexRule: AnonymizationRule = {
  type: 'RegExp',
  enabled: true,
  entityClass: 'EMAIL',
  pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
};

const testConfig = {
  enabled: false,
} as AnonymizationWorkerConfig;

describe('anonymizeRecords', () => {
  let logger: MockedLogger;

  let regexWorker: RegexWorkerService;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
    regexWorker = new RegexWorkerService(testConfig, logger);
  });

  it('masks values using regex rule', async () => {
    const input = [{ email: 'jorge21@gmail.com' }];

    const { records, anonymizations } = await anonymizeRecords({
      input,
      anonymizationRules: [regexRule],
      regexWorker,
      esClient: mockEsClient,
    });

    expect(records[0].email).not.toContain('jorge21@gmail.com');
    expect(anonymizations.length).toBe(1);
  });

  it('calls inferTrainedModel with a SINGLE doc when content < MAX_TOKENS_PER_DOC', async () => {
    const shortText = 'a'.repeat(500); // < 1000 chars
    setupMockResponse([{ entities: [] } as any]);

    await anonymizeRecords({
      input: [{ content: shortText }],
      anonymizationRules: [nerRule],
      regexWorker,
      esClient: mockEsClient,
    });

    expect(mockEsClient.ml.inferTrainedModel).toHaveBeenCalledTimes(1);
    const firstCallArgs = mockEsClient.ml.inferTrainedModel.mock.calls[0][0];
    expect(firstCallArgs.docs).toHaveLength(1);
    expect(firstCallArgs.docs[0].text_field).toBe(shortText);
  });

  it('splits text > MAX_TOKENS_PER_DOC into multiple docs', async () => {
    const longText = 'b'.repeat(1500); // > 1000 chars => should be split into 2 docs (1000 + 500)

    setupMockResponse(Array(2).fill({ entities: [] } as any));

    const { records } = await anonymizeRecords({
      input: [{ content: longText }],
      anonymizationRules: [nerRule],
      regexWorker,
      esClient: mockEsClient,
    });

    expect(mockEsClient.ml.inferTrainedModel).toHaveBeenCalledTimes(1);
    const callArgs = mockEsClient.ml.inferTrainedModel.mock.calls[0][0];
    expect(callArgs.docs).toHaveLength(2);
    expect(callArgs.docs[0].text_field).toBe(longText.slice(0, 1000));
    expect(callArgs.docs[1].text_field).toBe(longText.slice(1000));

    // reconstructed value should match original and appear only once
    expect(records[0].content).toBe(longText);
    expect((records[0].content.match(/b/g) ?? []).length).toBe(1500);
  });

  it('supports additional NER models of same class without duplication', async () => {
    const input = [{ content: 'Bob and Alice are friends.' }];

    // First model detects Alice only
    mockEsClient.ml.inferTrainedModel.mockResolvedValueOnce({
      inference_results: [
        {
          entities: [
            {
              entity: 'Alice',
              class_name: 'PER',
              class_probability: 0.99,
              start_pos: 8,
              end_pos: 13,
            },
          ],
        },
      ],
    });

    // Second model detects Bob only
    mockEsClient.ml.inferTrainedModel.mockResolvedValueOnce({
      inference_results: [
        {
          entities: [
            {
              entity: 'Bob',
              class_name: 'PER',
              class_probability: 0.97,
              start_pos: 0,
              end_pos: 3,
            },
          ],
        },
      ],
    });

    const { records, anonymizations } = await anonymizeRecords({
      input,
      anonymizationRules: [nerRule, nerRule2],
      regexWorker,
      esClient: mockEsClient,
    });

    const outputStr = JSON.stringify(records);
    expect(outputStr).not.toContain('Alice');
    expect(outputStr).not.toContain('Bob');

    const names = anonymizations.map((a) => a.entity.value).sort();
    expect(names).toEqual(['Alice', 'Bob']);
    expect(mockEsClient.ml.inferTrainedModel).toHaveBeenCalledTimes(2);
  });

  it('should anonymize records using a regex rule', async () => {
    const input = [
      {
        email: 'jorge21@gmail.com',
      },
    ];

    const result = await anonymizeRecords({
      input,
      anonymizationRules: [regexRule],
      regexWorker,
      esClient: mockEsClient,
    });

    expect(result.records[0].email).not.toContain('jorge21@gmail.com');
    expect(result.anonymizations.length).toBe(1);
    expect(result.anonymizations[0].entity.value).toBe('jorge21@gmail.com');
  });

  it('should anonymize records using a NER rule', async () => {
    const input = [
      {
        content: 'My name is Alice.',
      },
    ];

    const content = input[0].content;

    setupMockResponse([
      {
        entities: [
          {
            entity: 'Alice',
            class_name: 'PER',
            class_probability: 0.99,
            start_pos: content.indexOf('Alice'),
            end_pos: content.indexOf('Alice') + 'Alice'.length,
          },
        ],
      } as any,
    ]);

    const result = await anonymizeRecords({
      input,
      anonymizationRules: [nerRule],
      regexWorker,
      esClient: mockEsClient,
    });

    expect(result.records[0].content).not.toContain('Alice');
    expect(result.anonymizations.length).toBe(1);
    expect(result.anonymizations[0].entity.value).toBe('Alice');
  });

  it('allows subsequent NER models to add additional entities of the same class', async () => {
    const input = [
      {
        content: 'Bob and Alice are friends.',
      },
    ];

    // First NER model only detects "Alice"
    mockEsClient.ml.inferTrainedModel.mockResolvedValueOnce({
      inference_results: [
        {
          entities: [
            {
              entity: 'Alice',
              class_name: 'PER',
              class_probability: 0.99,
              start_pos: 8,
              end_pos: 13,
            },
          ],
        },
      ],
    });

    // Second NER model (same class) detects an additional entity, "Bob"
    mockEsClient.ml.inferTrainedModel.mockResolvedValueOnce({
      inference_results: [
        {
          entities: [
            {
              entity: 'Bob',
              class_name: 'PER',
              class_probability: 0.97,
              start_pos: 0,
              end_pos: 3,
            },
          ],
        },
      ],
    });

    const result = await anonymizeRecords({
      input,
      anonymizationRules: [nerRule, nerRule2],
      regexWorker,
      esClient: mockEsClient,
    });

    // Ensure that neither original name remains in the output
    expect(JSON.stringify(result.records)).not.toContain('Alice');
    expect(JSON.stringify(result.records)).not.toContain('Bob');

    // Ensure both entities are recorded in the anonymizations array
    expect(result.anonymizations.length).toBe(2);
    const names = result.anonymizations.map((a) => a.entity.value).sort();
    expect(names).toEqual(['Alice', 'Bob']);

    // Both models should have been invoked exactly once
    expect(mockEsClient.ml.inferTrainedModel).toHaveBeenCalledTimes(2);
  });
});
