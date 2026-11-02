/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * "Stage B2": a single `connector:execute` pod task type that runs a real, unmodified connector
 * executor (`stack_connectors/server/connector_types/{server_log,es_index}`) with the config,
 * secrets and params supplied directly in the run request.
 *
 * Deliberate, documented scope cut from the plan's "actions plugin execution path bundled": this
 * does NOT bundle `ActionsClient`, connector saved objects + encrypted saved objects, or
 * authorization — those resolve "which connector, with which decrypted secrets, is this caller
 * allowed to use" from Kibana's SO store, which is a large additional surface (`@kbn/actions-plugin`
 * SO/ESO registration, RBAC). The run request already carries the decrypted secrets (mirroring the
 * plan's "poke carries key" identity model extended to connector secrets), so what's proven here is
 * narrower and explicit: the real per-type executor functions run correctly inside the bundled pod.
 */
import { Client } from '@elastic/elasticsearch';
import { getConnectorType as getServerLogConnectorType } from '../../../../../stack_connectors/server/connector_types/server_log';
import { getConnectorType as getEsIndexConnectorType } from '../../../../../stack_connectors/server/connector_types/es_index';
import { ConsoleLogger } from '../../ports/console_logger';
import type { TaskRegistry } from '../server';

const buildClientOptions = () => {
  const { ES_URL, ES_API_KEY, ES_USERNAME, ES_PASSWORD } = process.env;
  if (!ES_URL) throw new Error('ES_URL is required');
  return {
    node: ES_URL,
    auth: ES_API_KEY ? { apiKey: ES_API_KEY } : { username: ES_USERNAME ?? 'elastic', password: ES_PASSWORD ?? 'changeme' },
  };
};

const CONNECTOR_EXECUTE_TASK_TYPE = 'connector:execute';

interface ConnectorExecuteParams {
  readonly connectorType: 'server-log' | 'es_index';
  readonly config: Record<string, unknown>;
  readonly secrets: Record<string, unknown>;
  readonly params: Record<string, unknown>;
}

export const buildConnectorsPod = (): { registry: TaskRegistry; internalClient: Client } => {
  const internalClient = new Client(buildClientOptions());
  const logger = new ConsoleLogger('plugins.actions', (process.env.LOG_LEVEL as never) ?? 'info');

  const connectorTypes = {
    'server-log': getServerLogConnectorType(),
    es_index: getEsIndexConnectorType(),
  };

  const registry: TaskRegistry = new Map();
  registry.set(CONNECTOR_EXECUTE_TASK_TYPE, (ctx) => ({
    run: async () => {
      const { connectorType, config, secrets, params } = ctx.taskInstance.params as unknown as ConnectorExecuteParams;
      const type = connectorTypes[connectorType];
      if (!type) throw new Error(`connector type '${connectorType}' is not in this pod's minimal set`);

      return type.executor({
        actionId: ctx.taskInstance.id,
        config,
        secrets,
        params,
        logger: logger as never,
        services: { scopedClusterClient: internalClient } as never,
        taskInfo: undefined as never,
      } as never);
    },
  }));

  return { registry, internalClient };
};
