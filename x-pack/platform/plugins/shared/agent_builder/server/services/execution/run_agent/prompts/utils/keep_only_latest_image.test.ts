/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHumanMessage, type BaseMessageLike, type HumanMessage } from '@langchain/core/messages';
import {
  createAIMessage,
  createUserMessage,
} from '@kbn/agent-builder-genai-utils/langchain/messages';
import {
  keepOnlyLatestImageUrlParts,
  PRIOR_SCREENSHOT_OMITTED_STUB,
} from './keep_only_latest_image';

const imageMessage = (label: string, data: string) =>
  createUserMessage([
    { type: 'text', text: label },
    {
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${data}` },
    },
  ]);

describe('keepOnlyLatestImageUrlParts', () => {
  it('leaves messages unchanged when there is at most one image', () => {
    const messages: BaseMessageLike[] = [
      ['system', 'sys'],
      createUserMessage('hello'),
      imageMessage('only shot', 'aaa'),
    ];

    expect(keepOnlyLatestImageUrlParts([...messages])).toEqual(messages);
  });

  it('keeps only the latest image and stubs earlier ones', () => {
    const first = imageMessage('first screenshot', 'aaa');
    const second = imageMessage('second screenshot', 'bbb');
    const messages: BaseMessageLike[] = [
      ['system', 'sys'],
      first,
      createAIMessage('thinking'),
      second,
    ];

    const result = keepOnlyLatestImageUrlParts([...messages]);

    expect(result).toHaveLength(4);
    expect(isHumanMessage(result[1] as HumanMessage)).toBe(true);
    expect((result[1] as HumanMessage).content).toContain('first screenshot');
    expect((result[1] as HumanMessage).content).toContain(PRIOR_SCREENSHOT_OMITTED_STUB);
    expect(JSON.stringify((result[1] as HumanMessage).content)).not.toContain('base64,aaa');

    expect(isHumanMessage(result[3] as HumanMessage)).toBe(true);
    const latestContent = (result[3] as HumanMessage).content;
    expect(Array.isArray(latestContent)).toBe(true);
    expect(JSON.stringify(latestContent)).toContain('base64,bbb');
    expect(JSON.stringify(latestContent)).toContain('second screenshot');
  });

  it('stubs multiple prior screenshots on the same message', () => {
    const multi = createUserMessage([
      { type: 'text', text: 'two images' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,old1' } },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,old2' } },
    ]);
    const latest = imageMessage('latest', 'new');

    const result = keepOnlyLatestImageUrlParts([multi, latest]);
    expect((result[0] as HumanMessage).content).toContain('2 prior screenshots omitted');
    expect(JSON.stringify((result[0] as HumanMessage).content)).not.toContain('old1');
    expect(JSON.stringify((result[1] as HumanMessage).content)).toContain('base64,new');
  });
});
