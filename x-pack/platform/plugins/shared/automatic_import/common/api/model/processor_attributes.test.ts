/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers';
import { ESProcessorItem, ESProcessorOptions } from './processor_attributes.gen';

describe('Processor attributes schema validation', () => {
  describe('ESProcessorOptions.if', () => {
    test('accepts a valid Painless condition', () => {
      expectParseSuccess(ESProcessorOptions.safeParse({ if: 'ctx.foo != null' }));
    });

    test('rejects a condition exceeding 4096 chars', () => {
      expectParseError(ESProcessorOptions.safeParse({ if: 'x'.repeat(4097) }));
    });

    test('accepts a condition at exactly 4096 chars', () => {
      expectParseSuccess(ESProcessorOptions.safeParse({ if: 'x'.repeat(4096) }));
    });
  });

  describe('ESProcessorOptions.tag', () => {
    test('accepts a valid tag', () => {
      expectParseSuccess(ESProcessorOptions.safeParse({ tag: 'my-tag' }));
    });

    test('rejects a tag exceeding 256 chars', () => {
      expectParseError(ESProcessorOptions.safeParse({ tag: 't'.repeat(257) }));
    });

    test('accepts a tag at exactly 256 chars', () => {
      expectParseSuccess(ESProcessorOptions.safeParse({ tag: 't'.repeat(256) }));
    });
  });

  describe('ESProcessorOptions.on_failure', () => {
    test('accepts an empty on_failure array', () => {
      expectParseSuccess(ESProcessorOptions.safeParse({ on_failure: [] }));
    });

    test('rejects more than 50 on_failure items', () => {
      const items: ESProcessorItem[] = new Array(51).fill({ set: { field: 'x', value: 'y' } });
      expectParseError(ESProcessorOptions.safeParse({ on_failure: items }));
    });

    test('accepts exactly 50 on_failure items', () => {
      const items: ESProcessorItem[] = new Array(50).fill({ set: { field: 'x', value: 'y' } });
      expectParseSuccess(ESProcessorOptions.safeParse({ on_failure: items }));
    });
  });

  describe('ESProcessorItem', () => {
    test('accepts a valid processor item', () => {
      expectParseSuccess(
        ESProcessorItem.safeParse({ set: { field: 'ecs.version', value: '8.11.0' } })
      );
    });

    test('accepts a processor item with options including if and tag', () => {
      expectParseSuccess(
        ESProcessorItem.safeParse({
          rename: {
            field: 'message',
            target_field: 'event.original',
            if: 'ctx.event?.original == null',
            tag: 'rename-message',
          },
        })
      );
    });
  });
});
