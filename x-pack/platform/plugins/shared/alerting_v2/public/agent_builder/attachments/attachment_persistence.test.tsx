/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { UpdateOriginResponse } from '@kbn/agent-builder-common/attachments';
import {
  type AttachmentPersistenceState,
  getAttachmentLocalPersistence,
  getAttachmentPersistenceNotice,
  getAttachmentRunStatus,
  isAttachmentSaved,
  runAttachmentSave,
  showsAttachmentPersistenceNotice,
  syncAttachmentOrigin,
  useAttachmentOutOfSync,
  useAttachmentPersistence,
} from './attachment_persistence';

const versionData = (
  createdAt: string,
  originSyncedAt?: string,
  { version = 1, versionCount = 1 }: { version?: number; versionCount?: number } = {}
) => ({
  version,
  versionCount,
  createdAt,
  originSyncedAt,
});

const updateOriginResolving = (originSnapshotAt?: string) =>
  jest.fn().mockResolvedValue({
    success: true,
    attachment: { origin_snapshot_at: originSnapshotAt },
  } as unknown as UpdateOriginResponse);

describe('getAttachmentLocalPersistence', () => {
  it('is unsaved without an origin', () => {
    expect(
      getAttachmentLocalPersistence({
        origin: undefined,
        createdAt: '2026-04-02T00:00:00.000Z',
        originSyncedAt: '2026-04-01T00:00:00.000Z',
      })
    ).toBe('unsaved');
  });

  it('has unsaved changes when the version is newer than the last sync', () => {
    expect(
      getAttachmentLocalPersistence({
        origin: 'id-1',
        createdAt: '2026-04-02T00:00:00.000Z',
        originSyncedAt: '2026-04-01T00:00:00.000Z',
      })
    ).toBe('unsaved_changes');
  });

  it('compares instants rather than strings', () => {
    expect(
      getAttachmentLocalPersistence({
        origin: 'id-1',
        createdAt: '2026-04-01T01:00:00.000+02:00',
        originSyncedAt: '2026-04-01T00:00:00.000Z',
      })
    ).toBe('in_sync');
  });

  it('is in sync when the version is not newer than the last sync', () => {
    expect(
      getAttachmentLocalPersistence({
        origin: 'id-1',
        createdAt: '2026-04-01T00:00:00.000Z',
        originSyncedAt: '2026-04-01T00:00:00.000Z',
      })
    ).toBe('in_sync');
  });

  it('is unknown when there is no sync timestamp to compare against', () => {
    expect(
      getAttachmentLocalPersistence({
        origin: 'id-1',
        createdAt: '2026-04-02T00:00:00.000Z',
        originSyncedAt: undefined,
      })
    ).toBe('unknown');
  });

  it('is in sync when a timestamp cannot be parsed', () => {
    expect(
      getAttachmentLocalPersistence({
        origin: 'id-1',
        createdAt: 'not-a-date',
        originSyncedAt: '2026-04-01T00:00:00.000Z',
      })
    ).toBe('in_sync');
  });
});

describe('getAttachmentPersistenceNotice', () => {
  const base: AttachmentPersistenceState = {
    isPersisted: true,
    isSaving: false,
    outOfSync: false,
    local: 'in_sync',
    isLatestVersion: true,
  };

  it('shows saved for the latest version when it matches the last sync', () => {
    expect(getAttachmentPersistenceNotice(base)).toBe('saved');
    expect(isAttachmentSaved(base)).toBe(true);
    expect(showsAttachmentPersistenceNotice(base)).toBe(true);
  });

  it.each([
    ['saving', { isSaving: true, outOfSync: true, local: 'unsaved_changes' as const }],
    ['out_of_sync', { outOfSync: true, local: 'unsaved_changes' as const }],
    ['unsaved_changes', { local: 'unsaved_changes' as const }],
  ])('prioritizes %s', (expected, override) => {
    const state = { ...base, ...override };
    expect(getAttachmentPersistenceNotice(state)).toBe(expected);
    expect(isAttachmentSaved(state)).toBe(false);
  });

  it.each([
    ['a draft', { isPersisted: false, local: 'unsaved' as const }],
    ['an attachment without a sync timestamp', { local: 'unknown' as const }],
    ['an older version', { isLatestVersion: false, local: 'unsaved_changes' as const }],
    ['an older version that is saving', { isLatestVersion: false, isSaving: true }],
  ])('shows nothing for %s', (_name, override) => {
    const state = { ...base, ...override };
    expect(getAttachmentPersistenceNotice(state)).toBeUndefined();
    expect(showsAttachmentPersistenceNotice(state)).toBe(false);
    expect(isAttachmentSaved(state)).toBe(false);
  });
});

describe('getAttachmentRunStatus', () => {
  const labels = { draft: 'Draft', enabled: 'Enabled', disabled: 'Disabled' };

  it('maps draft, enabled and disabled', () => {
    expect(getAttachmentRunStatus(labels, true, true)).toEqual({
      label: 'Draft',
      color: 'default',
    });
    expect(getAttachmentRunStatus(labels, false, true)).toEqual({
      label: 'Enabled',
      color: 'success',
    });
    expect(getAttachmentRunStatus(labels, false, false)).toEqual({
      label: 'Disabled',
      color: 'warning',
    });
  });
});

describe('runAttachmentSave', () => {
  it('ignores a second save for the same attachment while one is running', async () => {
    let finish: () => void = () => {};
    const first = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const second = jest.fn().mockResolvedValue(undefined);

    const pending = runAttachmentSave('att-dup', first);
    await runAttachmentSave('att-dup', second);
    finish();
    await pending;

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('allows another save once the first one has failed', async () => {
    await expect(
      runAttachmentSave('att-fail', () => Promise.reject(new Error('boom')))
    ).rejects.toThrow('boom');

    const retry = jest.fn().mockResolvedValue(undefined);
    await runAttachmentSave('att-fail', retry);

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('does not block saves of other attachments', async () => {
    let finish: () => void = () => {};
    const pending = runAttachmentSave(
      'att-a',
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const other = jest.fn().mockResolvedValue(undefined);

    await runAttachmentSave('att-b', other);
    finish();
    await pending;

    expect(other).toHaveBeenCalledTimes(1);
  });
});

describe('useAttachmentOutOfSync', () => {
  const synced = '2026-04-01T00:00:00.000Z';
  const newer = '2026-05-01T00:00:00.000Z';

  const renderOutOfSync = (
    fetchUpdatedAt: jest.Mock,
    overrides: Partial<Parameters<typeof useAttachmentOutOfSync>[0]> = {}
  ) =>
    renderHook(() =>
      useAttachmentOutOfSync({
        origin: 'id-1',
        snapshotUpdatedAt: synced,
        originSyncedAt: synced,
        fetchUpdatedAt,
        ...overrides,
      })
    );

  it('does not fetch for an attachment that was never saved', () => {
    const fetchUpdatedAt = jest.fn();
    const { result } = renderOutOfSync(fetchUpdatedAt, { origin: undefined });

    expect(result.current).toBe(false);
    expect(fetchUpdatedAt).not.toHaveBeenCalled();
  });

  it('does not fetch without a sync timestamp or snapshot', () => {
    const fetchUpdatedAt = jest.fn();
    renderOutOfSync(fetchUpdatedAt, { originSyncedAt: undefined });
    renderOutOfSync(fetchUpdatedAt, { snapshotUpdatedAt: undefined });

    expect(fetchUpdatedAt).not.toHaveBeenCalled();
  });

  it('does not fetch when disabled', () => {
    const fetchUpdatedAt = jest.fn();
    const { result } = renderOutOfSync(fetchUpdatedAt, { enabled: false });

    expect(result.current).toBe(false);
    expect(fetchUpdatedAt).not.toHaveBeenCalled();
  });

  it('flags a saved object that changed after the last sync', async () => {
    const fetchUpdatedAt = jest.fn().mockResolvedValue(newer);
    const { result } = renderOutOfSync(fetchUpdatedAt);

    await waitFor(() => expect(result.current).toBe(true));
    expect(fetchUpdatedAt).toHaveBeenCalledWith('id-1', expect.any(AbortSignal));
  });

  it('does not flag a saved object that is not newer than the last sync', async () => {
    const fetchUpdatedAt = jest.fn().mockResolvedValue(synced);
    const { result } = renderOutOfSync(fetchUpdatedAt);

    await waitFor(() => expect(fetchUpdatedAt).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('does not flag a saved object that matches the attachment snapshot', async () => {
    const fetchUpdatedAt = jest.fn().mockResolvedValue(newer);
    const { result } = renderOutOfSync(fetchUpdatedAt, { snapshotUpdatedAt: newer });

    await waitFor(() => expect(fetchUpdatedAt).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('treats a failed request as in sync', async () => {
    const fetchUpdatedAt = jest.fn().mockRejectedValue(new Error('404'));
    const { result } = renderOutOfSync(fetchUpdatedAt);

    await waitFor(() => expect(fetchUpdatedAt).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('aborts the request on unmount', () => {
    let signal: AbortSignal | undefined;
    const fetchUpdatedAt = jest.fn((_id: string, requestSignal: AbortSignal) => {
      signal = requestSignal;
      return new Promise<string>(() => {});
    });
    const { unmount } = renderOutOfSync(fetchUpdatedAt);

    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});

describe('useAttachmentPersistence', () => {
  it('combines the local state, the saving state and remote drift', async () => {
    const fetchUpdatedAt = jest.fn().mockResolvedValue('2026-05-01T00:00:00.000Z');
    const { result } = renderHook(() =>
      useAttachmentPersistence(
        {
          id: 'att-hook',
          origin: 'id-1',
          versionData: versionData('2026-04-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z'),
        },
        { snapshotUpdatedAt: '2026-04-01T00:00:00.000Z', fetchUpdatedAt }
      )
    );

    await waitFor(() => expect(result.current.outOfSync).toBe(true));
    expect(result.current).toEqual({
      isPersisted: true,
      isSaving: false,
      outOfSync: true,
      local: 'in_sync',
      isLatestVersion: true,
    });
  });

  it('is not persisted without an origin', () => {
    const { result } = renderHook(() =>
      useAttachmentPersistence(
        { id: 'att-hook-draft', origin: undefined, versionData: undefined },
        { snapshotUpdatedAt: undefined, fetchUpdatedAt: jest.fn() }
      )
    );

    expect(result.current.isPersisted).toBe(false);
    expect(result.current.local).toBe('unsaved');
    expect(result.current.isLatestVersion).toBe(true);
  });

  it('does not check older versions against the saved object', () => {
    const fetchUpdatedAt = jest.fn().mockResolvedValue('2026-05-01T00:00:00.000Z');
    const { result } = renderHook(() =>
      useAttachmentPersistence(
        {
          id: 'att-hook-old',
          origin: 'id-1',
          versionData: versionData('2026-04-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z', {
            version: 1,
            versionCount: 2,
          }),
        },
        { snapshotUpdatedAt: '2026-04-01T00:00:00.000Z', fetchUpdatedAt }
      )
    );

    expect(result.current.isLatestVersion).toBe(false);
    expect(getAttachmentPersistenceNotice(result.current)).toBeUndefined();
    expect(fetchUpdatedAt).not.toHaveBeenCalled();
  });
});

describe('syncAttachmentOrigin', () => {
  it('marks the current version as saved without waiting for new props', async () => {
    const attachment = {
      id: 'att-sync',
      origin: 'id-1',
      versionData: versionData('2026-04-02T00:00:00.000Z', '2026-04-01T00:00:00.000Z'),
    };
    const { result } = renderHook(() =>
      useAttachmentPersistence(attachment, {
        snapshotUpdatedAt: undefined,
        fetchUpdatedAt: jest.fn(),
      })
    );
    expect(result.current.local).toBe('unsaved_changes');

    const updateOrigin = updateOriginResolving('2026-04-03T00:00:00.000Z');
    let response: UpdateOriginResponse | undefined;
    await act(async () => {
      response = await syncAttachmentOrigin('att-sync', 'id-1', updateOrigin);
    });

    expect(updateOrigin).toHaveBeenCalledWith('id-1');
    expect(response?.success).toBe(true);
    expect(result.current.local).toBe('in_sync');
    expect(isAttachmentSaved(result.current)).toBe(true);
  });

  it('marks a draft as saved once its origin arrives', async () => {
    await act(async () => {
      await syncAttachmentOrigin(
        'att-created',
        'id-new',
        updateOriginResolving('2026-04-03T00:00:00.000Z')
      );
    });

    const { result } = renderHook(() =>
      useAttachmentPersistence(
        {
          id: 'att-created',
          origin: 'id-new',
          versionData: versionData('2026-04-02T00:00:00.000Z'),
        },
        { snapshotUpdatedAt: undefined, fetchUpdatedAt: jest.fn() }
      )
    );

    expect(result.current.local).toBe('in_sync');
  });

  it('does not treat the saved object as drifted after this save', async () => {
    const fetchUpdatedAt = jest.fn().mockResolvedValue('2026-04-02T12:00:00.000Z');
    await act(async () => {
      await syncAttachmentOrigin(
        'att-own-save',
        'id-1',
        updateOriginResolving('2026-04-02T12:00:01.000Z')
      );
    });

    const { result } = renderHook(() =>
      useAttachmentPersistence(
        {
          id: 'att-own-save',
          origin: 'id-1',
          versionData: versionData('2026-04-02T00:00:00.000Z', '2026-04-01T00:00:00.000Z'),
        },
        { snapshotUpdatedAt: '2026-04-01T00:00:00.000Z', fetchUpdatedAt }
      )
    );

    await waitFor(() => expect(fetchUpdatedAt).toHaveBeenCalled());
    expect(result.current.outOfSync).toBe(false);
    expect(isAttachmentSaved(result.current)).toBe(true);
  });

  it('keeps the later timestamp from props', async () => {
    await act(async () => {
      await syncAttachmentOrigin(
        'att-older-record',
        'id-1',
        updateOriginResolving('2026-04-01T00:00:00.000Z')
      );
    });

    const { result } = renderHook(() =>
      useAttachmentPersistence(
        {
          id: 'att-older-record',
          origin: 'id-1',
          versionData: versionData('2026-04-02T00:00:00.000Z', '2026-04-03T00:00:00.000Z'),
        },
        { snapshotUpdatedAt: undefined, fetchUpdatedAt: jest.fn() }
      )
    );

    expect(result.current.local).toBe('in_sync');
  });

  it('leaves the state alone when the response has no sync timestamp', async () => {
    await act(async () => {
      await syncAttachmentOrigin('att-no-timestamp', 'id-1', updateOriginResolving(undefined));
    });

    const { result } = renderHook(() =>
      useAttachmentPersistence(
        {
          id: 'att-no-timestamp',
          origin: 'id-1',
          versionData: versionData('2026-04-02T00:00:00.000Z', '2026-04-01T00:00:00.000Z'),
        },
        { snapshotUpdatedAt: undefined, fetchUpdatedAt: jest.fn() }
      )
    );

    expect(result.current.local).toBe('unsaved_changes');
  });
});
