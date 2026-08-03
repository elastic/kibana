/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { ContextEnginePlugin } from './plugin';

export type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ChatOpener,
  OpenChatOptions,
} from './types';

// Attachment type ids, re-exported so a downstream plugin (agent_builder_platform)
// can register their browser UI definitions and pass them to openChat.
export {
  AI_INDEX_ATTACHMENT_TYPE,
  PATTERN_ATTACHMENT_TYPE,
  CASE_ATTACHMENT_TYPE,
} from '../common/agent_builder/constants';

export const plugin = (context: PluginInitializerContext) => new ContextEnginePlugin(context);
