/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { ActionsConfig } from './config';
import type { InMemoryConnector } from '.';

export const ACTIONS_CONFIG = Symbol('actionsConfig') as ServiceIdentifier<ActionsConfig>;
export const IN_MEMORY_CONNECTORS_SERVICE = Symbol(
  'InMemoryConnectorsService'
) as ServiceIdentifier<InMemoryConnector[]>;
