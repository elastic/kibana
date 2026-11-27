/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ExternalSourceType } from '@kbn/alerting-v2-schemas';
import { connectorsSpecs } from '@kbn/connector-specs';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { inject, injectable } from 'inversify';
import type { AlertingServerStartDependencies } from '../../../types';

/** The connector type created for each import type. */
const CONNECTOR_TYPE_IDS: Readonly<Record<ExternalSourceType, string>> = {
  datadog: connectorsSpecs.Datadog.metadata.id,
};

/** Receive-only connectors have no credentials: they accept events but cannot run actions. */
const NO_AUTH = { authType: 'none' } as const;

export interface ExternalSourceConnectorServiceContract {
  /** Creates a receive-only connector for an import and returns its id. */
  create(params: { type: ExternalSourceType; name: string }): Promise<string>;
  /** Deletes an import's connector. A connector that no longer exists is ignored. */
  delete(id: string): Promise<void>;
}

/**
 * Creates and deletes the connectors that external sources receive events through, as the user of
 * the current request.
 */
@injectable()
export class ExternalSourceConnectorService implements ExternalSourceConnectorServiceContract {
  constructor(
    @inject(PluginStart<AlertingServerStartDependencies['actions']>('actions'))
    private readonly actions: AlertingServerStartDependencies['actions'],
    @inject(Request) private readonly request: KibanaRequest
  ) {}

  public async create({ type, name }: { type: ExternalSourceType; name: string }): Promise<string> {
    const actionsClient = await this.actions.getActionsClientWithRequest(this.request);
    const { id } = await actionsClient.create({
      action: {
        actionTypeId: CONNECTOR_TYPE_IDS[type],
        name,
        config: NO_AUTH,
        secrets: NO_AUTH,
      },
    });
    return id;
  }

  public async delete(id: string): Promise<void> {
    const actionsClient = await this.actions.getActionsClientWithRequest(this.request);
    try {
      await actionsClient.delete({ id });
    } catch (e) {
      if (isNotFoundError(e)) {
        return;
      }
      throw e;
    }
  }
}

const isNotFoundError = (e: unknown): boolean =>
  (e instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(e)) ||
  (Boom.isBoom(e) && e.output.statusCode === 404);
