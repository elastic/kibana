/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '../types';

/**
 * The plugin's setup and start in Kibana, so contributors and consumers see its registries; a task
 * pod builds its own, filled by the tasks entries of the contributing plugins.
 */
export const agentBuilderBridge = createTasksKibanaBridge<
  AgentBuilderPluginSetup,
  Pick<AgentBuilderPluginStart, 'agents' | 'tools' | 'conversations' | 'attachments'>
>();
