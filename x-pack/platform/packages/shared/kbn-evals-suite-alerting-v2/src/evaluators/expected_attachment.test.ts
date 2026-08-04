/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { TaskOutput } from '@kbn/evals';
import { ACTION_POLICY_ATTACHMENT_TYPE, RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import {
  RENDER_ATTACHMENT_TAG_RE,
  createExpectedAttachmentDataEvaluator,
  createExpectedRenderAttachmentEvaluator,
} from './expected_attachment';

const attachment = (
  id: string,
  type: string,
  data: Record<string, unknown> = {}
): VersionedAttachment =>
  ({
    id,
    type,
    current_version: 1,
    versions: [
      {
        version: 1,
        data,
        created_at: '2026-01-01T00:00:00.000Z',
        content_hash: 'hash-1',
      },
    ],
  } as VersionedAttachment);

const conversation = (
  assistantMessage: string,
  attachments: VersionedAttachment[] = []
): TaskOutput =>
  ({
    rounds: [
      {
        input: { message: 'user prompt' },
        response: { message: assistantMessage },
      },
    ],
    messages: [
      { role: 'user', message: 'user prompt' },
      { role: 'assistant', message: assistantMessage },
    ],
    attachments,
  } as unknown as TaskOutput);

const runRender = (output: TaskOutput, expected: Record<string, unknown> | null) =>
  createExpectedRenderAttachmentEvaluator().evaluate({
    input: { turns: [] },
    output,
    expected: expected ?? {},
    metadata: null,
  });

const runAttachmentData = (output: TaskOutput, expected: Record<string, unknown> | null) =>
  createExpectedAttachmentDataEvaluator().evaluate({
    input: { turns: [] },
    output,
    expected: expected ?? {},
    metadata: null,
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
    const result = await runRender(conversation('no tag here'), {});
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('throws when expectRenderAttachment is an empty array', async () => {
    await expect(
      runRender(conversation('<render_attachment id="abc" version="1"/>'), {
        expectRenderAttachment: [],
      })
    ).rejects.toThrow(/non-empty array of attachment types/i);
  });

  it('scores 1 when every expected attachment type was rendered', async () => {
    const result = await runRender(
      conversation(
        [
          '<render_attachment id="rule-1" version="1"/>',
          '<render_attachment id="wf-1" version="1"/>',
          '<render_attachment id="policy-1" version="1"/>',
        ].join('\n'),
        [
          attachment('rule-1', RULE_ATTACHMENT_TYPE),
          attachment('wf-1', 'workflow.yaml'),
          attachment('policy-1', ACTION_POLICY_ATTACHMENT_TYPE),
        ]
      ),
      {
        expectRenderAttachment: [
          RULE_ATTACHMENT_TYPE,
          'workflow.yaml',
          ACTION_POLICY_ATTACHMENT_TYPE,
        ],
      }
    );
    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        renderedTypes: expect.arrayContaining([
          RULE_ATTACHMENT_TYPE,
          'workflow.yaml',
          ACTION_POLICY_ATTACHMENT_TYPE,
        ]),
        missingTypes: [],
      })
    );
  });

  it('scores 0 when an expected attachment type was not rendered', async () => {
    const result = await runRender(
      conversation('<render_attachment id="rule-1" version="1"/>', [
        attachment('rule-1', RULE_ATTACHMENT_TYPE),
        attachment('policy-1', ACTION_POLICY_ATTACHMENT_TYPE),
      ]),
      { expectRenderAttachment: [RULE_ATTACHMENT_TYPE, ACTION_POLICY_ATTACHMENT_TYPE] }
    );
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        renderedTypes: [RULE_ATTACHMENT_TYPE],
        missingTypes: [ACTION_POLICY_ATTACHMENT_TYPE],
      })
    );
  });

  it('scores 0 when no render tag is present', async () => {
    const result = await runRender(conversation('I created a rule but forgot to render it.'), {
      expectRenderAttachment: [RULE_ATTACHMENT_TYPE],
    });
    expect(result.score).toBe(0);
  });
});

describe('createExpectedAttachmentDataEvaluator', () => {
  it('skips when there is no expectAttachmentData expectation', async () => {
    const result = await runAttachmentData(
      { attachments: [attachment('a1', RULE_ATTACHMENT_TYPE)] } as TaskOutput,
      {}
    );
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('throws when expectAttachmentData is present but not a function', async () => {
    await expect(
      runAttachmentData({ attachments: [] } as TaskOutput, {
        expectAttachmentData: true,
      })
    ).rejects.toThrow(/must be a function/i);
  });

  it('scores 1 when the callback passes', async () => {
    const result = await runAttachmentData(
      {
        attachments: [
          attachment('a1', RULE_ATTACHMENT_TYPE),
          attachment('a2', ACTION_POLICY_ATTACHMENT_TYPE),
        ],
      } as TaskOutput,
      {
        expectAttachmentData: (attachments: VersionedAttachment[]) => {
          expect(attachments.map((a) => a.type)).toEqual([
            RULE_ATTACHMENT_TYPE,
            ACTION_POLICY_ATTACHMENT_TYPE,
          ]);
        },
      }
    );
    expect(result.score).toBe(1);
  });

  it('scores 0 when the callback throws', async () => {
    const result = await runAttachmentData(
      { attachments: [attachment('a1', RULE_ATTACHMENT_TYPE)] } as TaskOutput,
      {
        expectAttachmentData: (attachments: VersionedAttachment[]) => {
          expect(attachments).toHaveLength(2);
        },
      }
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toMatch(/length|Expected/i);
  });
});
