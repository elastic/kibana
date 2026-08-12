/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '@kbn/spaces-plugin/common/constants';
import { findUnauthorizedTargetSpaces } from './authorize_target_spaces';

export interface DatasetSpaceDependencies {
  getSpaceId?: (request: KibanaRequest) => Promise<string>;
  getAccessibleSpaceIds?: (request: KibanaRequest) => Promise<string[]>;
  checkManageEvalsPrivileges?: (request: KibanaRequest, spaceIds: string[]) => Promise<boolean>;
  checkManageEvalsPrivilegesGlobally?: (request: KibanaRequest) => Promise<boolean>;
}

export type ResolveTargetSpacesResult =
  | { authorized: true; spaceIds: string[] }
  | { authorized: false; statusCode: 400 | 403; message: string };

/**
 * Decides which spaces a dataset write may target. Named ids must be visible to
 * the caller and manageable by them; `*` also needs that privilege everywhere.
 * Omitting them means the active space.
 *
 * A reassignment only authorizes the difference, so a rename isn't blocked by a
 * space that stays assigned and the caller can't manage.
 */
export const resolveTargetSpaces = async ({
  request,
  activeSpaceId,
  requestedSpaceIds,
  currentSpaceIds,
  getAccessibleSpaceIds,
  checkManageEvalsPrivileges,
  checkManageEvalsPrivilegesGlobally,
}: {
  request: KibanaRequest;
  activeSpaceId: string;
  requestedSpaceIds: string[] | undefined;
  currentSpaceIds?: string[];
} & Omit<DatasetSpaceDependencies, 'getSpaceId'>): Promise<ResolveTargetSpacesResult> => {
  let requested = dedupe(requestedSpaceIds ?? []);

  if (requested.length === 0) {
    return { authorized: true, spaceIds: [activeSpaceId] };
  }

  if (requested.includes(ALL_SPACES_ID)) {
    if (requested.length > 1) {
      return {
        authorized: false,
        statusCode: 400,
        message: `All spaces ("${ALL_SPACES_ID}") cannot be combined with specific space ids.`,
      };
    }

    const authorizedGlobally = checkManageEvalsPrivilegesGlobally
      ? await checkManageEvalsPrivilegesGlobally(request)
      : false;

    if (!authorizedGlobally) {
      return {
        authorized: false,
        statusCode: 403,
        message: `Insufficient privileges to assign a dataset to all spaces ("${ALL_SPACES_ID}"); it requires permission to manage evaluations in every space.`,
      };
    }

    return { authorized: true, spaceIds: [ALL_SPACES_ID] };
  }

  // Reads redact hidden spaces down to a single `?`. Expanding it back lets the
  // caller save what they were shown without unsharing spaces they never saw.
  const named = requested.filter((spaceId) => spaceId !== UNKNOWN_SPACE);
  if (named.length !== requested.length) {
    const hiddenSpaceIds = await findUnknownSpaces({
      request,
      spaceIds: (currentSpaceIds ?? []).filter((spaceId) => !named.includes(spaceId)),
      activeSpaceId,
      getAccessibleSpaceIds,
    });

    if (hiddenSpaceIds.length === 0) {
      return {
        authorized: false,
        statusCode: 400,
        message: `"${UNKNOWN_SPACE}" stands for a space you cannot see and cannot be assigned to.`,
      };
    }

    requested = dedupe([...named, ...hiddenSpaceIds]);
  }

  const current = new Set(currentSpaceIds ?? []);
  // Spaces already assigned are taken as given: they were validated then, and
  // one deleted since shouldn't block an unrelated edit.
  const added = requested.filter((spaceId) => !current.has(spaceId));

  const unknownSpaceIds = await findUnknownSpaces({
    request,
    spaceIds: added,
    activeSpaceId,
    getAccessibleSpaceIds,
  });

  if (unknownSpaceIds.length > 0) {
    return {
      authorized: false,
      statusCode: 400,
      message: `Unknown space id(s): ${unknownSpaceIds.join(', ')}.`,
    };
  }

  // `*` can't go through the per-space check below, so narrowing away from it
  // needs the same global privilege that assigning it did. Otherwise managing
  // one space would be enough to pull a dataset out of every other one.
  if (current.has(ALL_SPACES_ID)) {
    const authorizedGlobally = checkManageEvalsPrivilegesGlobally
      ? await checkManageEvalsPrivilegesGlobally(request)
      : false;

    if (!authorizedGlobally) {
      return {
        authorized: false,
        statusCode: 403,
        message: `Insufficient privileges to change the spaces of a dataset assigned to all spaces ("${ALL_SPACES_ID}"); it requires permission to manage evaluations in every space.`,
      };
    }
  }

  const removed = Array.from(current).filter(
    (spaceId) => !requested.includes(spaceId) && spaceId !== ALL_SPACES_ID
  );

  const unauthorizedSpaceIds = await findUnauthorizedTargetSpaces({
    request,
    requestedSpaceIds: [...added, ...removed],
    activeSpaceId,
    checkManageEvalsPrivileges,
  });

  if (unauthorizedSpaceIds.length > 0) {
    const refusedAdditions = unauthorizedSpaceIds.filter((spaceId) => added.includes(spaceId));
    const action =
      refusedAdditions.length === unauthorizedSpaceIds.length
        ? 'assign a dataset to'
        : refusedAdditions.length === 0
        ? 'remove a dataset from'
        : "change a dataset's spaces:";

    return {
      authorized: false,
      statusCode: 403,
      message: `Insufficient privileges to ${action} ${await describeSpaces({
        request,
        spaceIds: unauthorizedSpaceIds,
        getAccessibleSpaceIds,
      })}.`,
    };
  }

  return { authorized: true, spaceIds: requested };
};

/**
 * Strips the space assignment from a payload bound for another Kibana, whose
 * spaces are its own: a matching id there would be an unrelated space.
 */
export const withoutSpaceIds = <T extends { space_ids?: string[] }>(
  body: T
): Omit<T, 'space_ids'> => {
  const { space_ids: _spaceIds, ...rest } = body;
  return rest;
};

/**
 * Requested spaces that don't exist, so a typo fails instead of creating a
 * dataset nobody can reach. Spaces the caller can't see count as unknown, as
 * Kibana doesn't confirm a space exists to someone without access to it. Fails
 * closed when the space list is unavailable.
 */
const findUnknownSpaces = async ({
  request,
  spaceIds,
  activeSpaceId,
  getAccessibleSpaceIds,
}: {
  request: KibanaRequest;
  spaceIds: string[];
  activeSpaceId: string;
  getAccessibleSpaceIds?: (request: KibanaRequest) => Promise<string[]>;
}): Promise<string[]> => {
  const foreignSpaceIds = spaceIds.filter((spaceId) => spaceId !== activeSpaceId);
  if (foreignSpaceIds.length === 0) {
    return [];
  }

  if (!getAccessibleSpaceIds) {
    return foreignSpaceIds;
  }

  const accessibleSpaceIds = new Set(await getAccessibleSpaceIds(request));
  return foreignSpaceIds.filter((spaceId) => !accessibleSpaceIds.has(spaceId));
};

/**
 * Names the spaces in an error, counting the ones the caller can't see instead.
 * Those ids reach here from the stored assignment, not from the request, and a
 * read would have redacted them: naming them here would hand back what the
 * redaction withheld. Ids the caller sent are quoted back as-is elsewhere,
 * since those tell them nothing they didn't already type.
 */
const describeSpaces = async ({
  request,
  spaceIds,
  getAccessibleSpaceIds,
}: {
  request: KibanaRequest;
  spaceIds: string[];
  getAccessibleSpaceIds?: (request: KibanaRequest) => Promise<string[]>;
}): Promise<string> => {
  const accessibleSpaceIds = getAccessibleSpaceIds
    ? new Set(await getAccessibleSpaceIds(request))
    : undefined;
  const nameable = accessibleSpaceIds
    ? spaceIds.filter((spaceId) => accessibleSpaceIds.has(spaceId))
    : spaceIds;
  const hiddenCount = spaceIds.length - nameable.length;

  return [
    ...(nameable.length > 0 ? [nameable.join(', ')] : []),
    ...(hiddenCount > 0
      ? [`${hiddenCount} space${hiddenCount === 1 ? '' : 's'} you do not have access to`]
      : []),
  ].join(' and ');
};

/**
 * Replaces spaces the caller can't see with a placeholder, so a dataset can
 * show it is shared without naming where. Mirrors how Kibana redacts saved
 * object namespaces.
 */
export const redactSpaceIds = (
  spaceIds: string[] | undefined,
  accessibleSpaceIds: string[] | undefined
): string[] | undefined => {
  if (!spaceIds || spaceIds.includes(ALL_SPACES_ID)) {
    return spaceIds;
  }

  if (!accessibleSpaceIds) {
    return spaceIds;
  }

  const accessible = new Set(accessibleSpaceIds);
  const redacted = spaceIds.map((spaceId) => (accessible.has(spaceId) ? spaceId : UNKNOWN_SPACE));

  // One placeholder is enough to say "and somewhere you can't see"; a row of
  // identical ones would only count spaces the caller was denied the names of.
  return dedupe(redacted).sort(sortRedactedLast);
};

const sortRedactedLast = (a: string, b: string): number => {
  if (a === UNKNOWN_SPACE) return 1;
  if (b === UNKNOWN_SPACE) return -1;
  return 0;
};

const dedupe = (values: string[]): string[] => Array.from(new Set(values));
