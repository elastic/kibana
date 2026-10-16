/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useActiveSpaceId } from './use_active_space_id';

const createSpaces = (getActiveSpace: jest.Mock): SpacesPluginStart =>
  ({ getActiveSpace } as unknown as SpacesPluginStart);

describe('useActiveSpaceId', () => {
  it('returns the id of the active space once it resolves', async () => {
    const spaces = createSpaces(jest.fn().mockResolvedValue({ id: 'marketing' }));

    const { result } = renderHook(() => useActiveSpaceId(spaces));

    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBe('marketing'));
  });

  it('stays undefined without the spaces plugin', () => {
    const { result } = renderHook(() => useActiveSpaceId(undefined));

    expect(result.current).toBeUndefined();
  });

  it('stays undefined when the active space cannot be fetched', async () => {
    const getActiveSpace = jest.fn().mockRejectedValue(new Error('nope'));

    const { result } = renderHook(() => useActiveSpaceId(createSpaces(getActiveSpace)));

    await waitFor(() => expect(getActiveSpace).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it('ignores a result that arrives after unmount', async () => {
    let resolveSpace: (space: { id: string }) => void = () => {};
    const getActiveSpace = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveSpace = resolve;
      })
    );

    const { result, unmount } = renderHook(() => useActiveSpaceId(createSpaces(getActiveSpace)));
    unmount();
    resolveSpace({ id: 'marketing' });
    await Promise.resolve();

    expect(result.current).toBeUndefined();
  });
});
