/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { builtInServicesFromEcsEntityDefinition } from './services_from_ecs_data';
import { builtInHostsFromEcsEntityDefinition } from './hosts_from_ecs_data';
import { builtInContainersFromEcsEntityDefinition } from './containers_from_ecs_data';
import { BuiltInDefinition } from '../../types';

import * as kubernetes from './kubernetes';

export const builtInDefinitions: BuiltInDefinition[] = [
  builtInServicesFromEcsEntityDefinition,
  builtInHostsFromEcsEntityDefinition,
  builtInContainersFromEcsEntityDefinition,
  ...Object.values(kubernetes),
];
