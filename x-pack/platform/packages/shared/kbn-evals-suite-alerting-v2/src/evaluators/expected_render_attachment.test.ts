/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskOutput } from '@kbn/evals';
import {
  RENDER_ATTACHMENT_TAG_RE,
  createExpectedRenderAttachmentEvaluator,
} from './expected_render_attachment';

const conversation = (assistantMessage: string): TaskOutput =>
  ({
    messages: [{ message: 'user prompt' }, { message: assistantMessage }],
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
        matchedTag: '<render_attachment id="abc" version="1"/>',
        attachmentId: 'abc',
        attachmentVersion: 1,
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
});
