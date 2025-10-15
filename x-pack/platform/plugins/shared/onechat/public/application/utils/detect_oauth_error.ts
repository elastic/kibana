/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/onechat-common';
import { isToolCallStep } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

export interface OAuthErrorInfo {
  hasOAuthError: boolean;
  serverName?: string;
  serverId?: string;
}

/**
 * Detects if any tool call steps contain OAuth authentication errors
 * and extracts the server information
 */
export function detectOAuthErrorInSteps(steps: ConversationRoundStep[]): OAuthErrorInfo {
  for (const step of steps) {
    if (isToolCallStep(step)) {
      // Check if any result is an OAuth error
      for (const result of step.results) {
        if (result.type === ToolResultType.error) {
          const message = result.data.message || '';
          
          if (message.includes('OAuth authentication required for MCP server')) {
            // Extract server name from error message
            const serverNameMatch = message.match(
              /OAuth authentication required for MCP server "([^"]+)"/
            );
            const serverName = serverNameMatch ? serverNameMatch[1] : 'Unknown Server';
            
            // Extract serverId from tool ID (format: mcp.{serverId}.{toolName})
            const toolId = step.tool_id;
            
            if (toolId && toolId.startsWith('mcp.')) {
              const toolParts = toolId.split('.');
              const serverId = toolParts.length >= 3 ? toolParts[1] : undefined;
              
              if (serverId) {
                return {
                  hasOAuthError: true,
                  serverName,
                  serverId,
                };
              }
            }
          }
        }
      }
    }
  }
  
  return { hasOAuthError: false };
}

