/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '../../types';

export const getOtelCollectorDisplayName = (agent: Agent): string =>
  (agent.non_identifying_attributes?.['elastic.display.name'] as string | undefined) ?? agent.id;

export const getOtelCollectorConfigName = (agent: Agent): string | undefined =>
  agent.non_identifying_attributes?.['config.name'] as string | undefined;
