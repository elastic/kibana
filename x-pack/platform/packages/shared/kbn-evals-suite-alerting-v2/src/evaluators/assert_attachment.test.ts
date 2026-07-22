/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { TaskOutput } from '@kbn/evals';
import { createAssertAttachmentEvaluator } from './assert_attachment';

const ruleAttachment = (overrides: Partial<RuleAttachmentData> = {}): RuleAttachmentData =>
  ({
    kind: 'alert',
    schedule: { every: '1m', lookback: '5m' },
    ...overrides,
  } as RuleAttachmentData);

const run = async (output: TaskOutput, metadata: Record<string, unknown> | null = null) =>
  createAssertAttachmentEvaluator().evaluate({
    input: {},
    output,
    expected: {},
    metadata,
  });

describe('createAssertAttachmentEvaluator', () => {
  it('scores 1 when there is no assertAttachment expectation', async () => {
    const result = await run({ ruleAttachment: ruleAttachment() }, null);
    expect(result.score).toBe(1);
  });

  it('scores 0 when assertAttachment is set but no rule attachment was loaded', async () => {
    const result = await run(
      { conversationId: 'c1', attachments: [] },
      {
        assertAttachment: () => {
          expect(true).toBe(true);
        },
      }
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toMatch(/no rule attachment/i);
  });

  it('scores 1 when assertAttachment passes', async () => {
    const result = await run(
      { ruleAttachment: ruleAttachment() },
      {
        assertAttachment: (attachment: RuleAttachmentData) => {
          expect(attachment.schedule?.lookback).toEqual('5m');
        },
      }
    );
    expect(result.score).toBe(1);
  });

  it('scores 0 when assertAttachment throws (failed expect)', async () => {
    const result = await run(
      { ruleAttachment: ruleAttachment({ schedule: { every: '1m', lookback: '10m' } }) },
      {
        assertAttachment: (attachment: RuleAttachmentData) => {
          expect(attachment.schedule?.lookback).toEqual('5m');
        },
      }
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toMatch(/5m|lookback|Expected/i);
  });
});
