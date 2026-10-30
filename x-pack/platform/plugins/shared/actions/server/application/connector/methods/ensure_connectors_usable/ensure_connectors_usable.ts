/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CanonicalAcl, Principal } from '@kbn/access-control';
import { isSavedObjectErrorResult } from '@kbn/core/server';

import type { ActionsClientContext } from '../../../../actions_client';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import { getConnectorSpaceId } from '../../../../lib/connector_access';
import { getActionKibanaPrivileges } from '../../../../lib/get_action_kibana_privileges';
import type { RawAction } from '../../../../types';

export interface EnsureConnectorsUsableParams {
  context: ActionsClientContext;
  ids: string[];
  /** The principal a credential minted in this request acts for, which cannot be looked up yet. */
  principal?: Principal;
}

/**
 * Data of the error thrown for a connector the request's credential cannot use.
 */
export interface UnusableConnectorErrorData {
  connectorId: string;
}

const unusableConnectorError = (connectorId: string) =>
  Boom.forbidden<UnusableConnectorErrorData>(`Unable to use connector "${connectorId}"`, {
    connectorId,
  });

/**
 * Throws unless the request's credential can run every given stored connector: it needs the feature
 * privileges to execute the connector's type, and must be able to view and use the connector.
 */
export const ensureConnectorsUsable = async ({
  context,
  ids,
  principal,
}: EnsureConnectorsUsableParams): Promise<void> => {
  const accessControl = context.securityService?.accessControl.asScoped(context.request, {
    principal,
  });
  if (!accessControl?.isEnabled() || ids.length === 0) {
    return;
  }

  // The Saved Objects repository checks `view` as the credential, so a connector it cannot see
  // comes back as an error.
  const { saved_objects: connectors } =
    await context.unsecuredSavedObjectsClient.bulkGet<RawAction>(
      ids.map((id) => ({ type: ACTION_SAVED_OBJECT_TYPE, id }))
    );
  const objects: Array<{ id: string; acl?: CanonicalAcl }> = [];
  const connectorIdsByType = new Map<string, string[]>();
  for (const connector of connectors) {
    if (isSavedObjectErrorResult(connector)) {
      throw unusableConnectorError(connector.id);
    }

    const { id, acl, attributes } = connector;
    objects.push({ id, acl });
    connectorIdsByType.set(attributes.actionTypeId, [
      ...(connectorIdsByType.get(attributes.actionTypeId) ?? []),
      id,
    ]);
  }

  for (const [actionTypeId, [connectorId]] of connectorIdsByType) {
    try {
      await context.authorization.ensureAuthorized({
        operation: 'execute',
        actionTypeId,
        additionalPrivileges: getActionKibanaPrivileges(context, actionTypeId),
      });
    } catch (error) {
      if (Boom.isBoom(error) && error.output.statusCode === 403) {
        throw unusableConnectorError(connectorId);
      }
      throw error;
    }
  }

  const decisions = await accessControl.authorize({
    type: ACTION_SAVED_OBJECT_TYPE,
    spaceId: getConnectorSpaceId(context),
    operation: 'use',
    objects,
  });
  const deniedConnectorId = ids.find((id) => decisions.get(id)?.status !== 'allowed');
  if (deniedConnectorId) {
    throw unusableConnectorError(deniedConnectorId);
  }
};
