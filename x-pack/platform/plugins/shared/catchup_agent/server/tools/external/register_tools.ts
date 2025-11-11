/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ToolsSetup } from '@kbn/onechat-plugin/server';
import { slackDigestTool } from './slack_digest_tool';
import { githubSummaryTool } from './github_summary_tool';
import { gmailDigestTool } from './gmail_digest_tool';

export function registerExternalTools(toolsSetup: ToolsSetup, logger: Logger): void {
  toolsSetup.register(slackDigestTool());
  toolsSetup.register(githubSummaryTool());
  toolsSetup.register(gmailDigestTool());
}
