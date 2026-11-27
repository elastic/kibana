/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { anonymizeRecords } from './anonymize_records';
import type { AnonymizationRule, RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import type { MlInferenceResponseResult } from '@elastic/elasticsearch/lib/api/types';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { RegexWorkerService } from './regex_worker_service';
import type { AnonymizationWorkerConfig } from './types';
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
    const input = [
      {
        content: 'one email is jorge21@gmail.com and another is charles@gmail.com',
        data: 'something@gmail.com',
      },
    ];

    const { records, anonymizations } = await anonymizeRecords({
      input,
      anonymizationRules: [regexRule],
      regexWorker,
      esClient: mockEsClient,
    });

    expect(records[0].content).not.toContain('jorge21@gmail.com');
    expect(anonymizations.length).toBe(3);
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
    const longText = 'b'.repeat(1500); // > 512 chars => should be split into 3 docs (512 + 512 + 476)

    setupMockResponse(Array(3).fill({ entities: [] } as any));

    const { records } = await anonymizeRecords({
      input: [{ content: longText }],
      anonymizationRules: [nerRule],
      regexWorker,
      esClient: mockEsClient,
    });

    expect(mockEsClient.ml.inferTrainedModel).toHaveBeenCalledTimes(1);
    const callArgs = mockEsClient.ml.inferTrainedModel.mock.calls[0][0];
    expect(callArgs.docs).toHaveLength(3);
    expect(callArgs.docs[0].text_field).toBe(longText.slice(0, 512));
    expect(callArgs.docs[1].text_field).toBe(longText.slice(512, 1024));
    expect(callArgs.docs[2].text_field).toBe(longText.slice(1024));

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

  it('does not nest masks from later regex over earlier masked text', async () => {
    const testUrl = 'http://test.com';
    const input = [{ content: testUrl }];

    const urlRule: AnonymizationRule = {
      type: 'RegExp',
      enabled: true,
      entityClass: 'URL',
      pattern: 'https?://\\S+',
    };

    const numberRule: AnonymizationRule = {
      type: 'RegExp',
      enabled: true,
      entityClass: 'MISC',
      pattern: '\\d+',
    };

    const result = await anonymizeRecords({
      input,
      anonymizationRules: [urlRule, numberRule],
      regexWorker,
      esClient: mockEsClient,
    });

    const anonymizedContent = result.records[0].content;

    // Original URL must be removed
    expect(anonymizedContent).not.toContain(testUrl);

    // Later rule must not produce a nested MISC mask inside URL mask
    expect(anonymizedContent).not.toContain('MISC_');

    // Only the URL entity should be recorded
    const miscCount = result.anonymizations.filter((a) => a.entity.class_name === 'MISC').length;
    const urlCount = result.anonymizations.filter((a) => a.entity.class_name === 'URL').length;
    expect(miscCount).toBe(0);
    expect(urlCount).toBe(1);
  });

  it('ignores missing NER model errors and continues with other rules', async () => {
    const input = [{ content: 'Contact me at jane@example.com' }];
    mockEsClient.ml.inferTrainedModel.mockRejectedValueOnce(
      new Error("The NER model 'model-1' was not found. Please download and deploy the model.")
    );

    const result = await anonymizeRecords({
      input,
      anonymizationRules: [regexRule, nerRule],
      regexWorker,
      esClient: mockEsClient,
      logger,
    });

    expect(result.records[0].content).toContain('EMAIL_');
    expect(result.anonymizations.some((entry) => entry.rule.type === 'RegExp')).toBe(true);
  });

  it('rejects instead of returning unmasked records when inference against the NER model fails', async () => {
    mockEsClient.ml.inferTrainedModel.mockRejectedValueOnce(new Error('inference timed out'));

    await expect(
      anonymizeRecords({
        input: [{ content: 'Alice lives in Berlin' }],
        anonymizationRules: [nerRule],
        regexWorker,
        esClient: mockEsClient,
      })
    ).rejects.toThrow("Inference failed for NER model 'model-1'");
  });

  // Documents current behavior, not a guarantee: a missing or undeployed model quietly degrades to
  // the remaining rules. Whether that should fail closed is a separate decision.
  it.each([
    ['not found', 404, 'Could not find trained model'],
    ['not deployed', 409, 'Model must be deployed to use. Please deploy with the start API'],
  ])(
    'continues with regex-only masking when the NER model is %s',
    async (_, statusCode, reason) => {
      mockEsClient.ml.inferTrainedModel.mockRejectedValueOnce(
        new errors.ResponseError({
          statusCode,
          body: { error: { reason } },
          headers: {},
          warnings: null,
          meta: {} as any,
        })
      );

      const result = await anonymizeRecords({
        input: [{ content: 'Alice wrote from alice@example.com' }],
        anonymizationRules: [nerRule, regexRule],
        regexWorker,
        esClient: mockEsClient,
      });

      expect(result.records[0].content).toMatch(/^Alice wrote from EMAIL_[0-9a-f]{40}$/);
    }
  );

  it('masks the same entity identically across records, so the LLM can tell they are the same', async () => {
    const input = [{ content: 'Alice lives in Berlin' }, { content: 'Is Alice still in Berlin?' }];
    mockEsClient.ml.inferTrainedModel.mockImplementation(
      async ({ docs }: { docs: Array<{ text_field: string }> }) => ({
        inference_results: docs.map(({ text_field }) => ({
          entities: [
            {
              entity: 'Alice',
              class_name: 'PER',
              class_probability: 0.99,
              start_pos: text_field.indexOf('Alice'),
              end_pos: text_field.indexOf('Alice') + 'Alice'.length,
            },
          ],
        })),
      })
    );

    const result = await anonymizeRecords({
      input,
      anonymizationRules: [nerRule],
      regexWorker,
      esClient: mockEsClient,
    });

    const maskIn = (text: string) => text.match(/PER_[0-9a-f]{40}/)?.[0];
    expect(maskIn(result.records[0].content)).toBeDefined();
    expect(maskIn(result.records[1].content)).toBe(maskIn(result.records[0].content));
  });

  it('warns when it skips an NER rule because its model is not available, so the gap is visible', async () => {
    mockEsClient.ml.inferTrainedModel.mockRejectedValueOnce(
      new Error("The NER model 'model-1' was not found. Please download and deploy the model.")
    );

    await anonymizeRecords({
      input: [{ content: 'Contact me at jane@example.com' }],
      anonymizationRules: [nerRule],
      regexWorker,
      esClient: mockEsClient,
      logger,
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`model: ${(nerRule as { modelId?: string }).modelId ?? 'default'}`)
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('was not found'));
  });

  it('throws when regex execution fails and onFailure is "block" (default)', async () => {
    jest.spyOn(regexWorker, 'run').mockRejectedValueOnce(new Error('regex worker crashed'));

    await expect(
      anonymizeRecords({
        input: [{ content: 'jorge21@gmail.com' }],
        anonymizationRules: [regexRule],
        regexWorker,
        esClient: mockEsClient,
      })
    ).rejects.toThrow('regex worker crashed');
  });

  it('proceeds unmasked and logs a warning when regex execution fails and onFailure is "allow_unsafe"', async () => {
    jest.spyOn(regexWorker, 'run').mockRejectedValueOnce(new Error('regex worker crashed'));

    const input = [{ content: 'jorge21@gmail.com' }];
    const result = await anonymizeRecords({
      input,
      anonymizationRules: [regexRule],
      regexWorker,
      esClient: mockEsClient,
      onFailure: 'allow_unsafe',
      logger,
    });

    expect(result.records[0].content).toBe('jorge21@gmail.com');
    expect(result.anonymizations).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('regex worker crashed'));
  });

  // A rule that RE2 cannot compile runs on the legacy engine, which has no linear-time guarantee.
  // It must not share a worker task with the other rules: when it stalls and the task is aborted,
  // every match of the built-in and RE2 rules would be lost with it.
  describe('a rule that only the legacy engine supports', () => {
    const emailRule = regexRule as RegexAnonymizationRule;
    const legacyRule = (pattern: string, entityClass: 'MISC' | 'EMAIL' = 'MISC') =>
      ({
        type: 'RegExp',
        enabled: true,
        id: `legacy-${pattern}`,
        name: 'Legacy',
        entityClass,
        pattern,
      }) as RegexAnonymizationRule;
    const run = (
      rules: AnonymizationRule[],
      options: { onFailure?: 'block' | 'allow_unsafe'; content?: string } = {}
    ) =>
      anonymizeRecords({
        input: [{ content: options.content ?? 'mail jorge21@gmail.com and foobar' }],
        anonymizationRules: rules,
        regexWorker,
        esClient: mockEsClient,
        onFailure: options.onFailure ?? 'block',
        logger,
      });

    it('runs in a worker task of its own, apart from the other rules', async () => {
      const spy = jest.spyOn(regexWorker, 'run');
      const legacy = legacyRule('foo(?=bar)');

      const result = await run([emailRule, legacy]);

      expect(spy.mock.calls.map(([payload]) => payload.rules.map((rule) => rule.pattern))).toEqual([
        [emailRule.pattern],
        [legacy.pattern],
      ]);
      expect(result.records[0].content).toMatch(/^mail EMAIL_\w+ and MISC_\w+bar$/);
    });

    it('does not start a second task when no rule needs the legacy engine', async () => {
      const spy = jest.spyOn(regexWorker, 'run');

      await run([emailRule]);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('keeps the configured rule order when it overlaps another rule', async () => {
      const content = 'alice@example.com';

      const legacyFirst = await run([legacyRule('alice(?=@)'), emailRule], { content });
      const emailFirst = await run([emailRule, legacyRule('alice(?=@)')], { content });

      expect(legacyFirst.records[0].content).toMatch(/^MISC_/);
      expect(emailFirst.records[0].content).toMatch(/^EMAIL_/);
    });

    describe('when it stalls and its task is aborted', () => {
      const stalling = legacyRule('(?=a)(a+)+$');
      const abortOnlyTheLegacyTask = () => {
        const realRun = regexWorker.run.bind(regexWorker);
        jest
          .spyOn(regexWorker, 'run')
          .mockImplementation(async (payload) =>
            payload.rules.some((rule) => rule.id === stalling.id)
              ? Promise.reject(new Error('Anonymization patterns timed out after 15s'))
              : realRun(payload)
          );
      };

      it('with allow_unsafe still masks with the other rules and says it skipped the rule', async () => {
        abortOnlyTheLegacyTask();

        const result = await run([emailRule, stalling], { onFailure: 'allow_unsafe' });

        expect(result.records[0].content).toMatch(/^mail EMAIL_/);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('only the legacy engine supports failed; skipping them')
        );
      });

      it('with block fails the request', async () => {
        abortOnlyTheLegacyTask();

        await expect(run([emailRule, stalling], { onFailure: 'block' })).rejects.toThrow(
          'timed out'
        );
      });
    });

    describe('when the other rules fail too', () => {
      const legacy = legacyRule('(?=x)(x+)+$');
      const failSafeTask = (legacyTask: () => Promise<never>) => {
        jest
          .spyOn(regexWorker, 'run')
          .mockImplementation(async (payload) =>
            payload.rules.some((rule) => rule.id === legacy.id)
              ? legacyTask()
              : Promise.reject(new Error('regex worker crashed'))
          );
      };

      // With block the request fails whichever task fails first: it must not wait for a legacy
      // task that may still run until the worker timeout before reporting the error.
      it('with block reports the failure without waiting for a slow legacy task', async () => {
        failSafeTask(() => new Promise<never>(() => {}));

        await expect(run([emailRule, legacy], { onFailure: 'block' })).rejects.toThrow(
          'regex worker crashed'
        );
      });

      it('with allow_unsafe proceeds unmasked and reports both failures', async () => {
        failSafeTask(() => Promise.reject(new Error('legacy task timed out')));

        const result = await run([emailRule, legacy], { onFailure: 'allow_unsafe' });

        expect(result.records[0].content).toBe('mail jorge21@gmail.com and foobar');
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            'proceeding unmasked because onFailure is "allow_unsafe": regex worker crashed'
          )
        );
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('legacy engine supports failed; skipping them')
        );
      });
    });

    it('is reported once in the log, not on every request', async () => {
      const legacy = legacyRule('zq(?=x)');

      await run([legacy]);
      await run([legacy]);

      const reports = (logger.warn as jest.Mock).mock.calls.filter(([message]) =>
        String(message).includes('only the legacy regex engine supports')
      );
      expect(reports).toHaveLength(1);
    });
  });

  describe('a custom rule whose pattern does not compile', () => {
    const brokenRule: RegexAnonymizationRule = {
      type: 'RegExp',
      enabled: true,
      id: 'custom-broken',
      name: 'Broken pattern',
      entityClass: 'MISC',
      pattern: '(unclosed',
    };
    const input = [{ content: 'jorge21@gmail.com' }];

    it('fails the call under onFailure "block" instead of silently leaving data unmasked', async () => {
      await expect(
        anonymizeRecords({
          input,
          anonymizationRules: [regexRule, brokenRule],
          regexWorker,
          esClient: mockEsClient,
          onFailure: 'block',
        })
      ).rejects.toThrow(/"Broken pattern" has an invalid regular expression/);
    });

    it('skips only the broken rule, and says why, under onFailure "allow_unsafe"', async () => {
      const result = await anonymizeRecords({
        input,
        anonymizationRules: [regexRule, brokenRule],
        regexWorker,
        esClient: mockEsClient,
        onFailure: 'allow_unsafe',
        logger,
      });

      expect(result.records[0].content).not.toContain('jorge21@gmail.com');
      expect(result.anonymizations).toHaveLength(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('invalid regular expression')
      );
    });
  });

  it('still applies the valid rules when a broken rule comes first and onFailure is "allow_unsafe"', async () => {
    const brokenRule = { ...regexRule, pattern: '(unclosed' };

    const result = await anonymizeRecords({
      input: [{ content: 'jorge21@gmail.com' }],
      anonymizationRules: [brokenRule, regexRule],
      regexWorker,
      esClient: mockEsClient,
      onFailure: 'allow_unsafe',
      logger,
    });

    expect(result.records[0].content).not.toContain('jorge21@gmail.com');
    expect(result.anonymizations).toHaveLength(1);
  });

  it('applies known replacements before regex processing', async () => {
    const input = [{ content: 'Alice and alice@example.com' }];

    const result = await anonymizeRecords({
      input,
      anonymizationRules: [regexRule],
      regexWorker,
      esClient: mockEsClient,
      knownReplacements: [{ anonymized: 'USER_NAME_abc123', original: 'Alice' }],
    });

    expect(result.records[0].content).toContain('USER_NAME_abc123');
    expect(result.records[0].content).toContain('EMAIL_');
    expect(result.anonymizations.some((entry) => entry.rule.type === 'ReplacementMemory')).toBe(
      true
    );
  });
});
