/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/onechat-server/tools';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

/**
 * Safely extracts OneChat context from LangChain tool config.
 * Skill-tools receive context via config.configurable.onechat
 */
export const getOneChatContext = (config: any): Omit<ToolHandlerContext, 'resultStore'> | null => {
  return (config as any)?.configurable?.onechat ?? null;
};

/**
 * Type for a function that returns OsqueryAppContext.
 * This allows skills to access Osquery services at runtime.
 */
export type GetOsqueryAppContextFn = () => OsqueryAppContext | null;





