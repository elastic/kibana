/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LockManagerService } from '@kbn/lock-manager';
import type { Logger } from '@kbn/logging';
import type { ResourceKind } from '@kbn/resource-bootstrap-server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { EnabledResourceBootstrapConfig } from './config';
import type { ResourceKindRegistry } from './registry/resource_kind_registry';
import type { LedgerClient } from './ledger/ledger_client';
import type { RequestsClient } from './requests/requests_client';
import type { SpaceExists } from './space_exists';
import type { StatusClient } from './status/status_client';

export interface ResourceBootstrapSetup {
  registerResourceKind: <TResource>(kind: ResourceKind<TResource>) => void;
}

export interface ResourceBootstrapSetupDependencies {
  taskManager: TaskManagerSetupContract;
}

export interface ResourceBootstrapStartDependencies {
  taskManager: TaskManagerStartContract;
}

export interface InternalServices {
  logger: Logger;
  config: EnabledResourceBootstrapConfig;
  registry: ResourceKindRegistry;
  status: StatusClient;
  ledger: LedgerClient;
  requests: RequestsClient;
  lockManager: Pick<LockManagerService, 'withLock'>;
  taskManager: TaskManagerStartContract;
  spaceExists: SpaceExists;
  /** The running Kibana version, recorded with each write so a run after an upgrade can tell. */
  kibanaVersion: string;
}
