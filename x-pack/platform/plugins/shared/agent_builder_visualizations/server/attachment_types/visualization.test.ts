/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import { createVisualizationAttachmentType } from './visualization';

const mockToAPIFormat = jest.fn().mockReturnValue({ type: 'xy', layers: [] });

jest.mock('@kbn/lens-embeddable-utils', () => ({
  LensConfigBuilder: jest.fn().mockImplementation(() => ({
    toAPIFormat: (...args: unknown[]) => mockToAPIFormat(...args),
  })),
}));

const resolveMock = jest.fn();

const createContext = () =>
  ({
    savedObjectsClient: { resolve: resolveMock },
  } as unknown as AttachmentResolveContext);

describe('createVisualizationAttachmentType resolve()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToAPIFormat.mockReturnValue({ type: 'xy', layers: [] });
  });

  it('resolves a Lens saved object into a normalized lens attachment', async () => {
    resolveMock.mockResolvedValue({
      saved_object: {
        attributes: {
          title: 'My Visualization',
          state: {
            datasourceStates: {
              textBased: { layers: { layer1: { query: { esql: 'FROM logs' } } } },
            },
          },
        },
        references: [],
      },
      outcome: 'exactMatch',
    });

    const result = await createVisualizationAttachmentType().resolve!('viz-1', createContext());

    expect(resolveMock).toHaveBeenCalledWith('lens', 'viz-1');
    expect(result).toEqual({
      renderer: 'lens',
      query: 'My Visualization',
      visualization: { type: 'xy', layers: [] },
      chart_type: 'xy',
      esql: 'FROM logs',
    });
  });

  it('falls back to the saved object id as the query when the visualization has no title', async () => {
    resolveMock.mockResolvedValue({
      saved_object: { attributes: {}, references: [] },
      outcome: 'exactMatch',
    });

    const result = await createVisualizationAttachmentType().resolve!('viz-1', createContext());

    expect(result?.query).toBe('viz-1');
  });

  it('omits chart_type when the Lens API type is outside the supported vocabulary', async () => {
    mockToAPIFormat.mockReturnValue({ type: 'lnsXY', layers: [] });
    resolveMock.mockResolvedValue({
      saved_object: { attributes: { title: 'My Visualization' }, references: [] },
      outcome: 'exactMatch',
    });

    const result = await createVisualizationAttachmentType().resolve!('viz-1', createContext());

    expect(result).toHaveProperty('chart_type', undefined);
    expect(result?.renderer).toBe('lens');
  });

  it('returns undefined when the saved object cannot be resolved', async () => {
    resolveMock.mockResolvedValue({
      saved_object: { error: { message: 'Not found' } },
      outcome: 'exactMatch',
    });

    const result = await createVisualizationAttachmentType().resolve!('missing', createContext());

    expect(result).toBeUndefined();
  });

  it('returns undefined when there is no saved objects client', async () => {
    const result = await createVisualizationAttachmentType().resolve!(
      'viz-1',
      {} as AttachmentResolveContext
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when resolve throws', async () => {
    resolveMock.mockRejectedValue(new Error('boom'));

    const result = await createVisualizationAttachmentType().resolve!('viz-1', createContext());

    expect(result).toBeUndefined();
  });
});

describe('createVisualizationAttachmentType format()', () => {
  const describeAttachment = async (data: Record<string, unknown>): Promise<string> => {
    const definition = createVisualizationAttachmentType();
    const formatted = await definition.format(
      { id: 'att-1', type: 'visualization', data } as never,
      { request: {}, spaceId: 'default' } as never
    );
    const representation = await formatted.getRepresentation!();
    return (representation as { type: 'text'; value: string }).value;
  };

  const customContent = { renderer: 'custom_content', query: 'a board', visualization: {} };

  it('says a panel without queries is static', async () => {
    expect(await describeAttachment(customContent)).toContain('ES|QL: none (static content)');
  });

  it('names each query of a panel with several by the way the template reads it', async () => {
    const value = await describeAttachment({ ...customContent, esql: ['FROM a', 'FROM b'] });

    expect(value).toContain('ES|QL, read by the template as rows: FROM a');
    expect(value).toContain('ES|QL, read by the template as queries[1].rows: FROM b');
  });

  it('reads a query saved as a single string, as before a panel could have several', async () => {
    expect(await describeAttachment({ ...customContent, esql: 'FROM legacy' })).toContain(
      'ES|QL: FROM legacy'
    );
  });

  it('shows only the start of a very long query', async () => {
    const value = await describeAttachment({ ...customContent, esql: ['a'.repeat(100000)] });

    expect(value).toContain('truncated, 100000 characters in total');
    expect(value.length).toBeLessThan(5000);
  });
});
