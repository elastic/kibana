/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';

const isConflict = (error: unknown): boolean =>
  Boom.isBoom(error) && error.output.statusCode === 409;

/**
 * Implements guarantee 4b: any error thrown by `actionsClient.create()`/`update()` is
 * replaced with a new, generic, value-free error before it becomes step output. This
 * plan cannot audit every current and future spec-based connector type's custom
 * validator for whether its error text might echo a submitted config/secret value, so
 * the only guarantee that holds universally is to never forward that text at all.
 * Deliberately does not accept the original error, so it's impossible to accidentally
 * interpolate any part of it. `fieldNames` come only from this step's own
 * classification/collision-resolution logic (never from Vault response bodies), so
 * they are known-safe to surface.
 */
const sanitizedWriteError = ({
  verb,
  targetConnectorName,
  targetConnectorTypeId,
  fieldNames,
}: {
  verb: 'create' | 'update';
  targetConnectorName: string;
  targetConnectorTypeId: string;
  fieldNames: string[];
}): Error =>
  new Error(
    `Failed to ${verb} connector '${targetConnectorName}' (type ${targetConnectorTypeId}): ` +
      `the connector type rejected the provided configuration. ` +
      `Fields attempted: ${fieldNames.join(', ')}.`
  );

export interface UpsertConnectorParams {
  actionsClient: ActionsClient;
  mode: 'create' | 'upsert';
  targetConnectorId: string | undefined;
  targetConnectorTypeId: string;
  targetConnectorName: string;
  config: Record<string, string | number | boolean>;
  secrets: Record<string, string | number | boolean>;
}

export interface UpsertConnectorResult {
  connectorId: string;
  action: 'created' | 'updated';
}

/**
 * Real create/upsert semantics (\u00a75.3), including the actionTypeId match check: a
 * `targetConnectorId` that happens to collide with an unrelated existing connector (of
 * a different type) is a loud, immediate failure rather than a silent overwrite of that
 * connector's config/secrets with values shaped for the wrong type.
 *
 * Concurrency (explicit, accepted outcome, not a bug): two simultaneous `upsert` runs
 * against the same not-yet-existing `targetConnectorId` can race -- both may observe
 * "not found" and both attempt `create()`; one succeeds, the other receives a 409 and
 * that step run fails. No distributed lock is introduced; a failed run can be retried,
 * and its next attempt takes the `update()` branch since the connector now exists.
 */
export async function upsertConnector({
  actionsClient,
  mode,
  targetConnectorId,
  targetConnectorTypeId,
  targetConnectorName,
  config,
  secrets,
}: UpsertConnectorParams): Promise<UpsertConnectorResult> {
  const fieldNames = Object.keys({ ...config, ...secrets });

  if (mode === 'create') {
    try {
      const created = await actionsClient.create({
        action: { actionTypeId: targetConnectorTypeId, name: targetConnectorName, config, secrets },
        options: targetConnectorId ? { id: targetConnectorId } : undefined,
      });
      return { connectorId: created.id, action: 'created' };
    } catch (error) {
      // A 409 from an id collision fails loudly and unmodified -- it never overwrites,
      // and Kibana's own saved-objects-layer conflict message is already value-free.
      if (isConflict(error)) {
        throw error;
      }
      throw sanitizedWriteError({
        verb: 'create',
        targetConnectorName,
        targetConnectorTypeId,
        fieldNames,
      });
    }
  }

  // mode === 'upsert'
  if (!targetConnectorId) {
    throw new Error(`mode 'upsert' requires targetConnectorId.`);
  }

  let existing;
  try {
    existing = await actionsClient.get({ id: targetConnectorId });
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw error;
    }
    existing = undefined;
  }

  if (existing) {
    if (existing.actionTypeId !== targetConnectorTypeId) {
      throw new Error(
        `Connector ${targetConnectorId} is of type ${existing.actionTypeId}, not ` +
          `${targetConnectorTypeId}; refusing to overwrite an unrelated connector.`
      );
    }
    try {
      await actionsClient.update({
        id: targetConnectorId,
        action: { name: targetConnectorName, config, secrets },
      });
    } catch (error) {
      throw sanitizedWriteError({
        verb: 'update',
        targetConnectorName,
        targetConnectorTypeId,
        fieldNames,
      });
    }
    return { connectorId: targetConnectorId, action: 'updated' };
  }

  try {
    await actionsClient.create({
      action: { actionTypeId: targetConnectorTypeId, name: targetConnectorName, config, secrets },
      options: { id: targetConnectorId },
    });
  } catch (error) {
    // Concurrency-induced 409 (another run created it first): propagate unmodified,
    // same rationale as the `mode: 'create'` id-collision case above.
    if (isConflict(error)) {
      throw error;
    }
    throw sanitizedWriteError({
      verb: 'create',
      targetConnectorName,
      targetConnectorTypeId,
      fieldNames,
    });
  }
  return { connectorId: targetConnectorId, action: 'created' };
}
