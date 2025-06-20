/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AugmentMessageCodeBlocks,
  AugmentMessageCodeBlocksService,
  defaultValue,
} from './augment_message_code_blocks';
import { Conversation } from '@kbn/elastic-assistant';

describe('AugmentMessageCodeBlocksService', () => {
  it('start returns correct object', () => {
    const service = new AugmentMessageCodeBlocksService();
    const result = service.start();

    expect(result).toEqual({
      registerAugmentMessageCodeBlocks: expect.any(Function),
      getAugmentMessageCodeBlocks$: expect.any(Function),
    });
  });

  it('registers and unregisters augment message code blocks', () => {
    const service = new AugmentMessageCodeBlocksService();
    const { registerAugmentMessageCodeBlocks, getAugmentMessageCodeBlocks$ } = service.start();

    const values: AugmentMessageCodeBlocks[] = [];
    getAugmentMessageCodeBlocks$().subscribe((value) => {
      values.push(value);
    });

    const mockConversation = {} as Conversation;
    const mockAugmentMessageCodeBlocks: AugmentMessageCodeBlocks = {
      mount: jest.fn(({ currentConversation, showAnonymizedValues }) => {
        expect(currentConversation).toBe(mockConversation);
        expect(showAnonymizedValues).toBe(true);
        return jest.fn();
      }),
    };

    const unregister = registerAugmentMessageCodeBlocks(mockAugmentMessageCodeBlocks);

    values[1].mount({
      currentConversation: mockConversation,
      showAnonymizedValues: true,
    });

    expect(mockAugmentMessageCodeBlocks.mount).toHaveBeenCalledWith({
      currentConversation: mockConversation,
      showAnonymizedValues: true,
    });

    unregister();

    expect(values).toEqual([defaultValue, mockAugmentMessageCodeBlocks, defaultValue]);
  });

  it('stops the service correctly', () => {
    const service = new AugmentMessageCodeBlocksService();
    const { getAugmentMessageCodeBlocks$ } = service.start();

    let completed = false;
    getAugmentMessageCodeBlocks$().subscribe({
      complete: () => {
        completed = true;
      },
    });

    service.stop();
    expect(completed).toBe(true);
  });
});
