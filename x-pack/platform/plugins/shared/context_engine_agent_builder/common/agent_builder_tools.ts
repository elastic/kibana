/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextEngineAiIndexTools } from '@kbn/agent-builder-common/tools';

export const CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID =
  'platform.context_engine.save_automation' as const;

export const CONTEXT_ENGINE_REMEMBER_TOOL_ID = contextEngineAiIndexTools.remember;

export const CONTEXT_ENGINE_FORGET_TOOL_ID = contextEngineAiIndexTools.forget;
