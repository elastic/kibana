/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { TaskOutput } from '@kbn/evals';
import {
  RENDER_ATTACHMENT_TAG_RE,
  createExpectedRenderAttachmentEvaluator,
} from './expected_render_attachment';

const attachment = (id: string, type: string): VersionedAttachment =>
  ({
    id,
    type,
    current_version: 1,
    versions: [
      {
        version: 1,
        data: {},
        created_at: '2026-01-01T00:00:00.000Z',
        content_hash: 'hash-1',
      },
    ],
  } as VersionedAttachment);

const ruleAttachment = (overrides: Partial<RuleAttachmentData> = {}): RuleAttachmentData =>
  ({
    kind: 'alert',
    schedule: { every: '1m', lookback: '5m' },
    ...overrides,
  } as RuleAttachmentData);

const conversation = (
  assistantMessage: string,
  attachments: VersionedAttachment[] = [],
  extras: Partial<TaskOutput> = {}
): TaskOutput =>
  ({
    messages: [{ message: 'user prompt' }, { message: assistantMessage }],
    attachments,
    ...extras,
  } as unknown as TaskOutput);

const run = (output: TaskOutput, metadata: Record<string, unknown> | null) =>
  createExpectedRenderAttachmentEvaluator().evaluate({
    input: {},
    output,
    expected: {},
    metadata,
  });

describe('RENDER_ATTACHMENT_TAG_RE', () => {
  it('matches a self-closing tag with id and version', () => {
    expect(
      RENDER_ATTACHMENT_TAG_RE.test(
        '<render_attachment id="0bbfdb81-9bcb-4906-a302-a3daa16700f5" version="1"/>'
      )
    ).toBe(true);
  });

  it('matches when attributes are reordered and spaced', () => {
    expect(RENDER_ATTACHMENT_TAG_RE.test('<render_attachment version="2" id="abc-123" />')).toBe(
      true
    );
  });

  it('rejects a tag missing version', () => {
    expect(RENDER_ATTACHMENT_TAG_RE.test('<render_attachment id="abc-123" />')).toBe(false);
  });

  it('rejects a tag missing id', () => {
    expect(RENDER_ATTACHMENT_TAG_RE.test('<render_attachment version="1" />')).toBe(false);
  });
});

describe('createExpectedRenderAttachmentEvaluator', () => {
  it('skips when there is no render-attachment expectation', async () => {
    const result = await run(conversation('no tag here'), {});
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('scores 1 when a valid render_attachment tag is present', async () => {
    const result = await run(
      conversation(
        'Here is your rule:\n\n<render_attachment id="abc" version="1"/>\n\nClick Create.'
      ),
      { expectRenderAttachment: true }
    );
    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        matchedTags: ['<render_attachment id="abc" version="1"/>'],
      })
    );
  });

  it('scores 0 when the tag is missing', async () => {
    const result = await run(conversation('I created a rule but forgot to render it.'), {
      expectRenderAttachment: true,
    });
    expect(result.score).toBe(0);
  });

  it('scores 0 when the tag is incomplete', async () => {
    const result = await run(conversation('<render_attachment id="abc" />'), {
      expectRenderAttachment: true,
    });
    expect(result.score).toBe(0);
  });

  it('scores 1 when every expected attachment type was rendered', async () => {
    const result = await run(
      conversation(
        [
          '<render_attachment id="rule-1" version="1"/>',
          '<render_attachment id="wf-1" version="1"/>',
          '<render_attachment id="policy-1" version="1"/>',
        ].join('\n'),
        [
          attachment('rule-1', 'rule'),
          attachment('wf-1', 'workflow.yaml'),
          attachment('policy-1', 'action_policy'),
        ]
      ),
      { expectRenderAttachment: ['rule', 'workflow.yaml', 'action_policy'] }
    );
    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        renderedTypes: expect.arrayContaining(['rule', 'workflow.yaml', 'action_policy']),
        missingTypes: [],
      })
    );
  });

  it('scores 0 when an expected attachment type was not rendered', async () => {
    const result = await run(
      conversation('<render_attachment id="rule-1" version="1"/>', [
        attachment('rule-1', 'rule'),
        attachment('policy-1', 'action_policy'),
      ]),
      { expectRenderAttachment: ['rule', 'action_policy'] }
    );
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        renderedTypes: ['rule'],
        missingTypes: ['action_policy'],
      })
    );
  });

  it('scores 0 when assert is set but no rule attachment was loaded', async () => {
    const result = await run(
      conversation('<render_attachment id="rule-1" version="1"/>', [attachment('rule-1', 'rule')]),
      {
        expectRenderAttachment: {
          assert: () => {
            expect(true).toBe(true);
          },
        },
      }
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toMatch(/no rule attachment/i);
  });

  it('scores 1 when assert passes after a successful render', async () => {
    const result = await run(
      conversation(
        '<render_attachment id="rule-1" version="1"/>',
        [attachment('rule-1', 'rule')],
        { ruleAttachment: ruleAttachment() }
      ),
      {
        expectRenderAttachment: {
          assert: (data: RuleAttachmentData) => {
            expect(data.schedule?.lookback).toEqual('5m');
          },
        },
      }
    );
    expect(result.score).toBe(1);
  });

  it('scores 0 when assert throws after a successful render', async () => {
    const result = await run(
      conversation(
        '<render_attachment id="rule-1" version="1"/>',
        [attachment('rule-1', 'rule')],
        { ruleAttachment: ruleAttachment({ schedule: { every: '1m', lookback: '10m' } }) }
      ),
      {
        expectRenderAttachment: {
          assert: (data: RuleAttachmentData) => {
            expect(data.schedule?.lookback).toEqual('5m');
          },
        },
      }
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toMatch(/5m|lookback|Expected/i);
  });
});
