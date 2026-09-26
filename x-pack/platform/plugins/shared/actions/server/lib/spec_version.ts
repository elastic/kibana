/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ActionType } from '../types';
import { SpecVersionRequestError } from './errors/spec_version_request_error';
import { majorOf } from '../catalog/spec_version_format';

const notStoredMessage = (actionTypeId: string, requested: string): string =>
  `Spec version "${requested}" of connector type "${actionTypeId}" is not stored in this cluster; retry after the next catalog reload or check that it exists`;

const toBadRequest = (error: unknown, actionTypeId: string, requested: string): never => {
  if (error instanceof SpecVersionRequestError) {
    throw Boom.badRequest(error.message);
  }
  throw Boom.badRequest(notStoredMessage(actionTypeId, requested));
};

/**
 * Resolves the spec version a new connector is pinned to. Omitted requests pin to the newest
 * accepted 1.y. Classic types resolve to undefined.
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
  try {
    return await specVersions.resolveRequest(requestedVersion);
  } catch (error) {
    return toBadRequest(error, actionType.id, requestedVersion ?? '1');
  }
};

/**
 * Resolves the spec version an update writes. Omitted requests stay on the current major's
 * newest accepted minor. An exact or major request may move to any stored version.
 */
export const resolveSpecVersionForUpdate = async (
  actionType: Pick<ActionType, 'id' | 'specVersions'>,
  requestedVersion: string | undefined,
  currentPin: string | undefined
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
  const currentMajor = majorOf(currentPin ?? '1.0');
  try {
    return await specVersions.resolveRequest(requestedVersion, currentMajor);
  } catch (error) {
    return toBadRequest(error, actionType.id, requestedVersion ?? String(currentMajor));
  }
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
      }" is pinned to spec version "${specVersion}", which is not available: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
