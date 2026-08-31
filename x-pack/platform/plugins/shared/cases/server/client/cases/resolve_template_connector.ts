/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { ConnectorTypes } from '../../../common/types/domain';
import type { CasePostRequest } from '../../../common/types/api';
import type { CaseConnectorWithoutName } from '../../../common/types/domain_zod/connector/v1';

/**
 * Resolves a template connector's display `name` from its `id` (YAML stores connectors without a
 * name). Returns undefined when there is no connector, the connector is `.none`, or the id no
 * longer resolves — callers then keep their existing connector (typically `.none`).
 */
export const resolveTemplateConnector = async (
  templateConnector: CaseConnectorWithoutName | undefined,
  actionsClient: PublicMethodsOf<ActionsClient>,
  logger: Logger
): Promise<CasePostRequest['connector'] | undefined> => {
  if (!templateConnector || templateConnector.type === ConnectorTypes.none) {
    return undefined;
  }

  try {
    const action = await actionsClient.get({ id: templateConnector.id });
    return { ...templateConnector, name: action.name } as CasePostRequest['connector'];
  } catch (error) {
    // The connector default is dropped. A genuinely-missing / unauthorized connector is expected
    // here, but so is a transient ES/auth error — log at warn so a real infra/authz failure
    // silently changing the created case is diagnosable (system-action runs under the rule
    // request context; Actions get can 403 even when Cases create succeeds).
    logger.warn(
      `Dropping template connector default "${templateConnector.id}"; could not resolve it: ${error}`
    );
    return undefined;
  }
};
