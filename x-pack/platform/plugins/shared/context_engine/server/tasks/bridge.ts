/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { ContextEnginePluginStart } from '../types';

/** What other plugins' tasks entries use of Context Engine: the AI index services. */
export type ContextEngineTasksStart = Pick<
  ContextEnginePluginStart,
  'getAiIndexService' | 'getAiIndexDataReadService'
>;

/**
 * The plugin's start contract in Kibana, so contributors' tasks entries see the services (and the
 * managed AI indices registered at setup) of the real plugin; a task pod builds its own.
 */
export const contextEngineBridge = createTasksKibanaBridge<void, ContextEngineTasksStart>();
