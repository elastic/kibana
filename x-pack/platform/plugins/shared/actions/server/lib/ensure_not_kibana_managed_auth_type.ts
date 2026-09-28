/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { isKibanaManagedAuthTypeId } from '@kbn/connector-specs';

interface EnsureNotKibanaManagedAuthTypeParams {
  actionTypeId: string;
  secrets?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

/**
 * Rejects a create/update asking for an auth type Kibana manages, whatever the connector type.
 * Belongs on the mutation path only — secrets validation also runs on execute, which would break
 * the in-memory connectors Kibana provisions itself.
 */
export const ensureNotKibanaManagedAuthType = ({
  actionTypeId,
  secrets,
  config,
}: EnsureNotKibanaManagedAuthTypeParams): void => {
  const authTypeId =
    (secrets as { authType?: string } | undefined)?.authType ??
    (config as { authType?: string } | undefined)?.authType;

  if (!authTypeId || !isKibanaManagedAuthTypeId(authTypeId)) {
    return;
  }

  throw Boom.badRequest(
    i18n.translate('xpack.actions.serverSideErrors.kibanaManagedAuthTypeForbidden', {
      defaultMessage:
        'Authentication type {authTypeId} is set by {kibana} and cannot be configured on a connector. Action type: {actionTypeId}.',
      values: { authTypeId, actionTypeId, kibana: 'Kibana' },
    })
  );
};
