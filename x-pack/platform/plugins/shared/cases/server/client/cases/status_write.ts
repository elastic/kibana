/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { CaseStatuses } from '../../../common/types/domain';
import type { CaseStatusDefinition } from '../../../common/types/domain/space_settings/v1';
import {
  getCaseStatus,
  resolveStatusWrite,
  StatusWriteError,
} from '../../../common/utils/statuses';
import {
  isCustomStatusesEnabled,
  throwIfStatusKeyWhileDisabled,
} from '../../common/custom_statuses';
import type { CasesServices } from '../types';

export interface PersistedStatus {
  status: CaseStatuses;
  status_key: string;
}

/**
 * The space's statuses for resolving writes, or `undefined` while custom statuses are off (writes
 * then keep the legacy behavior and never load the settings).
 */
export const getStatusesForWrite = async ({
  spaceSettingsService,
}: Pick<CasesServices, 'spaceSettingsService'>): Promise<CaseStatusDefinition[] | undefined> =>
  isCustomStatusesEnabled() ? spaceSettingsService.getStatuses() : undefined;

const resolveOrThrow = (args: Parameters<typeof resolveStatusWrite>[0]) => {
  try {
    return resolveStatusWrite(args);
  } catch (error) {
    if (error instanceof StatusWriteError) {
      throw Boom.badRequest(error.message);
    }
    throw error;
  }
};

/**
 * The `status_key` a new case is persisted with. New cases start in the not started category;
 * without custom statuses they get no key, as before.
 */
export const resolveStatusForCreate = ({
  statuses,
  statusKey,
}: {
  statuses: readonly CaseStatusDefinition[] | undefined;
  statusKey?: string | null;
}): Pick<PersistedStatus, 'status_key'> | undefined => {
  throwIfStatusKeyWhileDisabled(statusKey);

  if (statuses == null) {
    return undefined;
  }

  const resolved = resolveOrThrow({ statuses, status: CaseStatuses.open, statusKey });
  return resolved ? { status_key: resolved.status_key } : undefined;
};

/**
 * The status fields an update persists, or `undefined` when it leaves the status alone. A move to
 * the status the case is already in resolves to its current `status` only, so the caller's diff
 * drops it as unchanged.
 */
export const resolveStatusForUpdate = ({
  statuses,
  status,
  statusKey,
  current,
}: {
  statuses: readonly CaseStatusDefinition[] | undefined;
  status?: CaseStatuses;
  statusKey?: string | null;
  current: { status: CaseStatuses; statusKey?: string | null };
}): Partial<PersistedStatus> | undefined => {
  throwIfStatusKeyWhileDisabled(statusKey);

  if (statuses == null) {
    return status == null ? undefined : { status };
  }

  const resolved = resolveOrThrow({ statuses, status, statusKey, current });
  if (!resolved) {
    return undefined;
  }

  const currentKey = getCaseStatus(statuses, current).key;
  if (resolved.status === current.status && resolved.status_key === currentKey) {
    return { status: resolved.status };
  }

  return resolved;
};

/**
 * With custom statuses off, a status change drops the key kept from when they were on, since it
 * names a status of the old category. The case then reads as its new category's default.
 */
export const clearStatusKeyWhileDisabled = ({
  status,
  current,
}: {
  status?: CaseStatuses;
  current: { status: CaseStatuses; statusKey?: string | null };
}): { status_key: null } | undefined =>
  !isCustomStatusesEnabled() &&
  status != null &&
  status !== current.status &&
  current.statusKey != null
    ? { status_key: null }
    : undefined;
