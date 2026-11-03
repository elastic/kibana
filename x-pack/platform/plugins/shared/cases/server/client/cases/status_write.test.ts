/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { CaseStatuses } from '../../../common/types/domain';
import type { CaseStatusDefinition } from '../../../common/types/domain/space_settings/v1';
import { DEFAULT_CASE_STATUSES } from '../../../common/utils/statuses';
import { setCustomStatusesEnabled } from '../../common/custom_statuses';
import { createSpaceSettingsServiceMock } from '../../services/mocks';
import {
  clearStatusKeyWhileDisabled,
  getStatusesForWrite,
  resolveStatusForCreate,
  resolveStatusForUpdate,
} from './status_write';

const statuses: CaseStatusDefinition[] = [
  ...DEFAULT_CASE_STATUSES,
  {
    key: 'triage',
    label: 'Triage',
    color: 'accent',
    category: 'not_started',
    order: 3,
    isDefault: false,
    disabled: false,
  },
  {
    key: 'duplicate',
    label: 'Duplicate',
    color: 'default',
    category: 'done',
    order: 4,
    isDefault: false,
    disabled: false,
  },
];

describe('status_write', () => {
  afterEach(() => {
    setCustomStatusesEnabled(false);
  });

  describe('with custom statuses on', () => {
    beforeEach(() => {
      setCustomStatusesEnabled(true);
    });

    it('loads the space statuses', async () => {
      const spaceSettingsService = createSpaceSettingsServiceMock();
      spaceSettingsService.getStatuses.mockResolvedValue(statuses);

      await expect(getStatusesForWrite({ spaceSettingsService })).resolves.toEqual(statuses);
    });

    it('creates cases in the default not started status', () => {
      expect(resolveStatusForCreate({ statuses })).toEqual({ status_key: 'open' });
    });

    it('creates cases in a requested not started status', () => {
      expect(resolveStatusForCreate({ statuses, statusKey: 'triage' })).toEqual({
        status_key: 'triage',
      });
    });

    it('rejects creating a case in a status of another category', () => {
      expect(() => resolveStatusForCreate({ statuses, statusKey: 'duplicate' })).toThrow(
        'Status "Duplicate" is a done status, which does not match status "open".'
      );
    });

    it('rejects an unknown key with a 400', () => {
      let error: unknown;
      try {
        resolveStatusForUpdate({
          statuses,
          statusKey: 'missing',
          current: { status: CaseStatuses.open },
        });
      } catch (e) {
        error = e;
      }

      expect(isBoom(error) && error.output.statusCode).toBe(400);
      expect(isBoom(error) && error.message).toBe('Status "missing" does not exist in this space.');
    });

    it('sets the category from a key', () => {
      expect(
        resolveStatusForUpdate({
          statuses,
          statusKey: 'duplicate',
          current: { status: CaseStatuses.open, statusKey: null },
        })
      ).toEqual({ status: CaseStatuses.closed, status_key: 'duplicate' });
    });

    it('moves within a category by key only', () => {
      expect(
        resolveStatusForUpdate({
          statuses,
          statusKey: 'triage',
          current: { status: CaseStatuses.open, statusKey: null },
        })
      ).toEqual({ status: CaseStatuses.open, status_key: 'triage' });
    });

    it('lands a status-only write on the category default', () => {
      expect(
        resolveStatusForUpdate({
          statuses,
          status: CaseStatuses.closed,
          current: { status: CaseStatuses.open, statusKey: 'triage' },
        })
      ).toEqual({ status: CaseStatuses.closed, status_key: 'closed' });
    });

    it('keeps a custom status when a status-only write names its category', () => {
      expect(
        resolveStatusForUpdate({
          statuses,
          status: CaseStatuses.open,
          current: { status: CaseStatuses.open, statusKey: 'triage' },
        })
      ).toEqual({ status: CaseStatuses.open });
    });

    it('treats the default key of a legacy case as no change', () => {
      expect(
        resolveStatusForUpdate({
          statuses,
          statusKey: 'open',
          current: { status: CaseStatuses.open, statusKey: null },
        })
      ).toEqual({ status: CaseStatuses.open });
    });

    it('returns undefined when the request has no status', () => {
      expect(
        resolveStatusForUpdate({ statuses, current: { status: CaseStatuses.open } })
      ).toBeUndefined();
    });

    it('never clears a key', () => {
      expect(
        clearStatusKeyWhileDisabled({
          status: CaseStatuses.closed,
          current: { status: CaseStatuses.open, statusKey: 'triage' },
        })
      ).toBeUndefined();
    });
  });

  describe('with custom statuses off', () => {
    it('does not load the space statuses', async () => {
      const spaceSettingsService = createSpaceSettingsServiceMock();

      await expect(getStatusesForWrite({ spaceSettingsService })).resolves.toBeUndefined();
      expect(spaceSettingsService.getStatuses).not.toHaveBeenCalled();
    });

    it('rejects a status_key', () => {
      expect(() => resolveStatusForCreate({ statuses: undefined, statusKey: 'triage' })).toThrow(
        'Custom statuses are turned off.'
      );
      expect(() =>
        resolveStatusForUpdate({
          statuses: undefined,
          statusKey: 'open',
          current: { status: CaseStatuses.open },
        })
      ).toThrow('Custom statuses are turned off.');
    });

    it('writes no key', () => {
      expect(resolveStatusForCreate({ statuses: undefined })).toBeUndefined();
      expect(
        resolveStatusForUpdate({
          statuses: undefined,
          status: CaseStatuses.closed,
          current: { status: CaseStatuses.open },
        })
      ).toEqual({ status: CaseStatuses.closed });
    });

    it('clears a key left from when they were on when the category changes', () => {
      expect(
        clearStatusKeyWhileDisabled({
          status: CaseStatuses.closed,
          current: { status: CaseStatuses.open, statusKey: 'triage' },
        })
      ).toEqual({ status_key: null });
    });

    it('keeps the key when the category does not change or there is none', () => {
      expect(
        clearStatusKeyWhileDisabled({
          status: CaseStatuses.open,
          current: { status: CaseStatuses.open, statusKey: 'triage' },
        })
      ).toBeUndefined();
      expect(
        clearStatusKeyWhileDisabled({
          status: CaseStatuses.closed,
          current: { status: CaseStatuses.open, statusKey: null },
        })
      ).toBeUndefined();
    });
  });
});
