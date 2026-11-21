/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateOriginResponse } from '@kbn/agent-builder-common/attachments';
import { hasUnsavedChanges, recordAttachmentSync } from './attachment_save_state';

const SYNCED_AT = '2026-04-01T00:00:00.000Z';
const LATER = '2026-04-02T00:00:00.000Z';
const LATEST = '2026-04-03T00:00:00.000Z';

const versionData = (
  overrides: Partial<{
    version: number;
    versionCount: number;
    createdAt: string;
    originSyncedAt: string | undefined;
  }> = {}
) => ({
  version: 1,
  versionCount: 1,
  createdAt: SYNCED_AT,
  originSyncedAt: SYNCED_AT,
  ...overrides,
});

const originResponse = (originSnapshotAt?: string) =>
  ({
    success: true,
    attachment: { origin_snapshot_at: originSnapshotAt },
  } as unknown as UpdateOriginResponse);

describe('hasUnsavedChanges', () => {
  it('is true when the latest version was created after the last sync', () => {
    expect(
      hasUnsavedChanges({
        id: 'att-1',
        origin: 'rule-1',
        versionData: versionData({ version: 2, versionCount: 2, createdAt: LATER }),
      })
    ).toBe(true);
  });

  it.each([
    [
      'the attachment was never saved',
      { origin: undefined, versionData: versionData({ createdAt: LATER }) },
    ],
    ['there is no version metadata', { origin: 'rule-1', versionData: undefined }],
    [
      'there is no sync date',
      {
        origin: 'rule-1',
        versionData: versionData({ createdAt: LATER, originSyncedAt: undefined }),
      },
    ],
    [
      'the version was snapshotted at the sync date',
      { origin: 'rule-1', versionData: versionData() },
    ],
    [
      'the version predates the sync date',
      { origin: 'rule-1', versionData: versionData({ originSyncedAt: LATER }) },
    ],
    [
      'the version is not the latest one',
      { origin: 'rule-1', versionData: versionData({ versionCount: 2, createdAt: LATER }) },
    ],
    [
      'a timestamp cannot be parsed',
      { origin: 'rule-1', versionData: versionData({ createdAt: 'not-a-date' }) },
    ],
  ])('is false when %s', (_name, attachment) => {
    expect(hasUnsavedChanges({ id: 'att-1', ...attachment })).toBe(false);
  });

  it('compares instants rather than strings', () => {
    expect(
      hasUnsavedChanges({
        id: 'att-1',
        origin: 'rule-1',
        versionData: versionData({ createdAt: '2026-04-01T01:00:00.000+02:00' }),
      })
    ).toBe(false);
  });
});

describe('recordAttachmentSync', () => {
  const unsavedEdit = (id: string, originSyncedAt = SYNCED_AT) => ({
    id,
    origin: 'rule-1',
    versionData: versionData({ version: 2, versionCount: 2, createdAt: LATER, originSyncedAt }),
  });

  it('clears unsaved changes once a later sync is recorded', () => {
    const attachment = unsavedEdit('att-recorded');
    expect(hasUnsavedChanges(attachment)).toBe(true);

    recordAttachmentSync('att-recorded', originResponse(LATEST));

    expect(hasUnsavedChanges(attachment)).toBe(false);
  });

  it('only applies to the attachment it was recorded for', () => {
    recordAttachmentSync('att-other', originResponse(LATEST));

    expect(hasUnsavedChanges(unsavedEdit('att-unrelated'))).toBe(true);
  });

  it('ignores a response without a sync date', () => {
    recordAttachmentSync('att-no-date', originResponse(undefined));
    recordAttachmentSync('att-no-date', undefined);

    expect(hasUnsavedChanges(unsavedEdit('att-no-date'))).toBe(true);
  });

  it('keeps the later sync date from props over an older recorded one', () => {
    recordAttachmentSync('att-older-record', originResponse(SYNCED_AT));

    expect(hasUnsavedChanges(unsavedEdit('att-older-record', LATEST))).toBe(false);
  });
});
