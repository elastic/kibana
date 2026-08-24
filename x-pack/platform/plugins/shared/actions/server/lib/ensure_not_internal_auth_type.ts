/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { isInternalAuthType } from '@kbn/connector-specs';

interface EnsureNotInternalAuthTypeParams {
  actionTypeId: string;
  secrets?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

/**
 * Rejects a create/update asking for an auth type the spec marks internal. Belongs on the mutation
 * path only — secrets validation also runs on execute, which would break the in-memory connectors
 * Kibana provisions itself.
 */
export const ensureNotInternalAuthType = ({
  actionTypeId,
  secrets,
  config,
}: EnsureNotInternalAuthTypeParams): void => {
  const authTypeId =
    (secrets as { authType?: string } | undefined)?.authType ??
    (config as { authType?: string } | undefined)?.authType;

  if (!isInternalAuthType(actionTypeId, authTypeId)) {
    return;
  }

  throw Boom.badRequest(
    i18n.translate('xpack.actions.serverSideErrors.internalAuthTypeForbidden', {
      defaultMessage:
        'Authentication type {authTypeId} is set by {kibana} and cannot be configured on a connector. Action type: {actionTypeId}.',
      values: { authTypeId, actionTypeId, kibana: 'Kibana' },
    })
  );
};
