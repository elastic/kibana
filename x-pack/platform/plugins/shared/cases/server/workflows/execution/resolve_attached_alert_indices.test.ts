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

const attachedAlert = (id: string, index: string): DocumentResponse[number] => ({
  id,
  index,
  attached_at: ATTACHED_AT,
});

describe('resolveAttachedAlertIndices', () => {
  const resolveAlertIndices: jest.MockedFunction<CasesWorkflowOperations['resolveAlertIndices']> =
    jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resolveAlertIndices.mockResolvedValue([]);
  });

  it('returns the attached alerts without resolving when every selection matches exactly', async () => {
    const attached = [attachedAlert('alert-1', BACKING_INDEX)];

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached,
        resolveAlertIndices,
      })
    ).resolves.toBe(attached);
    expect(resolveAlertIndices).not.toHaveBeenCalled();
  });

  it('adds the concrete index an alias-stored alert resolves to', async () => {
    resolveAlertIndices.mockResolvedValueOnce([{ id: 'alert-1', index: BACKING_INDEX }]);

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached: [attachedAlert('alert-1', ALIAS)],
        resolveAlertIndices,
      })
    ).resolves.toEqual([attachedAlert('alert-1', ALIAS), attachedAlert('alert-1', BACKING_INDEX)]);
    expect(resolveAlertIndices).toHaveBeenCalledWith({
      alerts: [{ id: 'alert-1', index: ALIAS }],
    });
  });

  it('resolves only the attachments of selections that do not match exactly', async () => {
    const otherAlias = '.alerts-security.alerts-other';

    await resolveAttachedAlertIndices({
      selected: [
        { _id: 'alert-1', _index: BACKING_INDEX },
        { _id: 'alert-2', _index: BACKING_INDEX },
        { _id: 'alert-3', _index: BACKING_INDEX },
      ],
      attached: [
        attachedAlert('alert-1', BACKING_INDEX),
        attachedAlert('alert-2', ALIAS),
        attachedAlert('alert-3', otherAlias),
        attachedAlert('alert-4', ALIAS),
      ],
      resolveAlertIndices,
    });

    expect(resolveAlertIndices).toHaveBeenCalledTimes(1);
    expect(resolveAlertIndices).toHaveBeenCalledWith({
      alerts: [
        { id: 'alert-2', index: ALIAS },
        { id: 'alert-3', index: otherAlias },
      ],
    });
  });

  it('ignores resolved alerts that are not attached', async () => {
    resolveAlertIndices.mockResolvedValueOnce([{ id: 'alert-99', index: BACKING_INDEX }]);
    const attached = [attachedAlert('alert-1', ALIAS)];

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached,
        resolveAlertIndices,
      })
    ).resolves.toEqual(attached);
  });

  it('does not resolve a selection whose id is not attached to the case', async () => {
    const attached = [attachedAlert('alert-1', ALIAS)];

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-99', _index: BACKING_INDEX }],
        attached,
        resolveAlertIndices,
      })
    ).resolves.toBe(attached);
    expect(resolveAlertIndices).not.toHaveBeenCalled();
  });

  it('propagates resolution failures', async () => {
    resolveAlertIndices.mockRejectedValueOnce(new Error('cluster unavailable'));

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached: [attachedAlert('alert-1', ALIAS)],
        resolveAlertIndices,
      })
    ).rejects.toThrow('cluster unavailable');
  });
});
