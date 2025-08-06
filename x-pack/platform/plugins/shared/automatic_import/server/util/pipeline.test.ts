/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IScopedClusterClient } from '@kbn/core/server';

import { ensureProcessorsCompile } from './pipeline';
import { type ESProcessorItem } from '../../common';

describe('ensureProcessorsCompile', () => {
  it('returns the same processors when none fail', async () => {
    const mockClient = {
      asCurrentUser: {
        ingest: {
          simulate: jest.fn().mockResolvedValue({}),
        },
      },
    } as unknown as IScopedClusterClient;

    const processors = [{ set: { field: 'foo', value: 'bar' } }];
    const result = await ensureProcessorsCompile(processors, mockClient);
    expect(result).toEqual(processors);
  });

  it('removes the failing processor when a tag is specified', async () => {
    // This client rejects all rename processors and returns a tag as a hint
    const mockClient = {
      asCurrentUser: {
        ingest: {
          simulate: jest.fn().mockImplementation(({ pipeline }) => {
            for (const processor of pipeline.processors) {
              if ('rename' in processor) {
                const error = new Error('Compile error') as Error & { meta: object };
                error.meta = {
                  body: { error: { processor_tag: processor.rename.tag } },
                };
                throw error;
              }
            }
            return [];
          }),
        },
      },
    } as unknown as IScopedClusterClient;

    const processors = [
      { set: { field: 'foo', value: 'bar' } },
      { rename: { field: 'fail' } },
      { set: { field: 'baz', value: 'qux' } },
      { rename: { field: 'fail' } },
      { rename: { field: 'fail' } },
    ] as ESProcessorItem[];

    const result = await ensureProcessorsCompile(processors, mockClient);

    expect(result).toEqual([
      { set: { field: 'foo', value: 'bar' } },
      { set: { field: 'baz', value: 'qux' } },
    ]);
  });

  it('returns an empty array if the last remaining processor fails', async () => {
    const mockClient = {
      asCurrentUser: {
        ingest: {
          simulate: jest.fn().mockImplementation(({ pipeline }) => {
            const error = new Error('Compile error') as Error & { meta: object };
            error.meta = { body: { error: pipeline.processors[0].fail.tag } };
            throw error;
          }),
        },
      },
    } as unknown as IScopedClusterClient;

    const processors = [{ fail: { message: 'error' } }];
    const result = await ensureProcessorsCompile(processors, mockClient);
    expect(result).toEqual([]);
  });

  it('removes the failing processor even if no tag is specified', async () => {
    // This client rejects all rename processors without giving out a tag
    const mockClient = {
      asCurrentUser: {
        ingest: {
          simulate: jest.fn().mockImplementation(({ pipeline }) => {
            for (const processor of pipeline.processors) {
              if ('rename' in processor) {
                const error = new Error('Compile error');
                throw error;
              }
            }
            return [];
          }),
        },
      },
    } as unknown as IScopedClusterClient;

    const processors = [
      { set: { field: 'foo', value: 'bar' } },
      { rename: { field: 'fail' } },
      { set: { field: 'baz', value: 'qux' } },
      { rename: { field: 'fail' } },
      { rename: { field: 'fail' } },
    ] as ESProcessorItem[];

    const result = await ensureProcessorsCompile(processors, mockClient);

    expect(result).toEqual([
      { set: { field: 'foo', value: 'bar' } },
      { set: { field: 'baz', value: 'qux' } },
    ]);
  });
});
