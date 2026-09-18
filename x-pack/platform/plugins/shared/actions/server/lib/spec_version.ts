/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ActionType } from '../types';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Resolves the spec version a new connector is pinned to: the requested version when given,
 * otherwise the catalog-active version. Classic types resolve to undefined.
 */
export const resolveSpecVersionForCreate = async (
  actionType: Pick<ActionType, 'id' | 'specVersions'>,
  requestedVersion: string | undefined
): Promise<string | undefined> => {
  const { specVersions } = actionType;
  if (!specVersions) {
    if (requestedVersion !== undefined) {
      throw Boom.badRequest(
        `Connector type "${actionType.id}" does not support spec versions; omit spec_version.`
      );
    }
    return undefined;
  }
  if (requestedVersion === undefined) {
    return specVersions.getActiveVersion();
  }
  try {
    await specVersions.getSpec(requestedVersion);
  } catch (error) {
    throw Boom.badRequest(
      `Spec version "${requestedVersion}" of connector type "${
        actionType.id
      }" is not available: ${errorMessage(error)}`
    );
  }
  return requestedVersion;
};

/**
 * Makes sure the pinned spec version is materialized before synchronous validation runs.
 * Fails closed: a pinned version that cannot be obtained is an error, never a fallback.
 */
export const ensureSpecVersionLoaded = async (
  actionType: Pick<ActionType, 'id' | 'specVersions'>,
  specVersion: string | undefined,
  connectorId: string
): Promise<void> => {
  const { specVersions } = actionType;
  if (!specVersions || specVersion === undefined) {
    return;
  }
  try {
    await specVersions.getSpec(specVersion);
  } catch (error) {
    throw new Error(
      `Connector "${connectorId}" of type "${
        actionType.id
      }" is pinned to spec version "${specVersion}", which is not available: ${errorMessage(error)}`
    );
  }
};
