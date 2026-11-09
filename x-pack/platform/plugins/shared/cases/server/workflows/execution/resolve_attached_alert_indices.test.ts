/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentResponse } from '../../../common/types/api';
import type { CasesWorkflowOperations } from '../../client/workflows/operations';
import { resolveAttachedAlertIndices } from './resolve_attached_alert_indices';

const ALIAS = '.alerts-security.alerts-default';
const BACKING_INDEX = '.internal.alerts-security.alerts-default-000001';
const ATTACHED_AT = '2026-08-26T00:00:00.000Z';

const attachedAlert = (
  id: string,
  index: string,
  attachedAt: string = ATTACHED_AT
): DocumentResponse[number] => ({
  id,
  index,
  attached_at: attachedAt,
});

describe('resolveAttachedAlertIndices', () => {
  const confirmAlertIndices: jest.MockedFunction<CasesWorkflowOperations['confirmAlertIndices']> =
    jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    confirmAlertIndices.mockResolvedValue([]);
  });

  it('returns the attached alerts without confirming when every selection matches exactly', async () => {
    const attached = [attachedAlert('alert-1', BACKING_INDEX)];

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached,
        confirmAlertIndices,
      })
    ).resolves.toBe(attached);
    expect(confirmAlertIndices).not.toHaveBeenCalled();
  });

  it('adds the selected index an alias-stored alert is confirmed in', async () => {
    confirmAlertIndices.mockResolvedValueOnce([
      { id: 'alert-1', index: BACKING_INDEX, attachedIndex: ALIAS },
    ]);

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached: [attachedAlert('alert-1', ALIAS)],
        confirmAlertIndices,
      })
    ).resolves.toEqual([attachedAlert('alert-1', ALIAS), attachedAlert('alert-1', BACKING_INDEX)]);
    expect(confirmAlertIndices).toHaveBeenCalledWith({
      claims: [{ id: 'alert-1', index: BACKING_INDEX, attachedIndex: ALIAS }],
    });
  });

  it('claims only the selections that do not match exactly, through each of their attachments', async () => {
    const otherAlias = '.alerts-security.alerts-other';
    const otherBackingIndex = '.internal.alerts-security.alerts-default-000002';

    await resolveAttachedAlertIndices({
      selected: [
        { _id: 'alert-1', _index: BACKING_INDEX },
        { _id: 'alert-2', _index: BACKING_INDEX },
        { _id: 'alert-3', _index: otherBackingIndex },
      ],
      attached: [
        attachedAlert('alert-1', BACKING_INDEX),
        attachedAlert('alert-2', ALIAS),
        attachedAlert('alert-3', ALIAS),
        attachedAlert('alert-3', otherAlias),
        attachedAlert('alert-4', ALIAS),
      ],
      confirmAlertIndices,
    });

    expect(confirmAlertIndices).toHaveBeenCalledTimes(1);
    expect(confirmAlertIndices).toHaveBeenCalledWith({
      claims: [
        { id: 'alert-2', index: BACKING_INDEX, attachedIndex: ALIAS },
        { id: 'alert-3', index: otherBackingIndex, attachedIndex: ALIAS },
        { id: 'alert-3', index: otherBackingIndex, attachedIndex: otherAlias },
      ],
    });
  });

  it('adds a confirmed index through the attachment whose stored index reached it', async () => {
    const otherAlias = '.alerts-security.alerts-other';
    const otherAttachedAt = '2026-08-27T00:00:00.000Z';
    confirmAlertIndices.mockResolvedValueOnce([
      { id: 'alert-1', index: BACKING_INDEX, attachedIndex: otherAlias },
    ]);

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached: [
          attachedAlert('alert-1', ALIAS),
          attachedAlert('alert-1', otherAlias, otherAttachedAt),
        ],
        confirmAlertIndices,
      })
    ).resolves.toEqual([
      attachedAlert('alert-1', ALIAS),
      attachedAlert('alert-1', otherAlias, otherAttachedAt),
      attachedAlert('alert-1', BACKING_INDEX, otherAttachedAt),
    ]);
  });

  it('ignores confirmed claims that no attachment made', async () => {
    confirmAlertIndices.mockResolvedValueOnce([
      { id: 'alert-99', index: BACKING_INDEX, attachedIndex: ALIAS },
      { id: 'alert-1', index: BACKING_INDEX, attachedIndex: '.alerts-security.alerts-other' },
    ]);
    const attached = [attachedAlert('alert-1', ALIAS)];

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached,
        confirmAlertIndices,
      })
    ).resolves.toEqual(attached);
  });

  it('does not confirm a selection whose id is not attached to the case', async () => {
    const attached = [attachedAlert('alert-1', ALIAS)];

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-99', _index: BACKING_INDEX }],
        attached,
        confirmAlertIndices,
      })
    ).resolves.toBe(attached);
    expect(confirmAlertIndices).not.toHaveBeenCalled();
  });

  it('propagates confirmation failures', async () => {
    confirmAlertIndices.mockRejectedValueOnce(new Error('cluster unavailable'));

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached: [attachedAlert('alert-1', ALIAS)],
        confirmAlertIndices,
      })
    ).rejects.toThrow('cluster unavailable');
  });
});
