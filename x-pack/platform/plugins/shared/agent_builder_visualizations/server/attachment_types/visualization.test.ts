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
      query: 'viz-1',
      visualization: { type: 'xy', layers: [] },
      chart_type: 'xy',
      esql: 'FROM logs',
    });
  });

  it('omits chart_type when the Lens API type is outside the supported vocabulary', async () => {
    mockToAPIFormat.mockReturnValue({ type: 'lnsXY', layers: [] });
    resolveMock.mockResolvedValue({
      saved_object: { attributes: { title: 'My Visualization' }, references: [] },
      outcome: 'exactMatch',
    });

    const result = await createVisualizationAttachmentType().resolve!('viz-1', createContext());

    expect(result?.chart_type).toBeUndefined();
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
