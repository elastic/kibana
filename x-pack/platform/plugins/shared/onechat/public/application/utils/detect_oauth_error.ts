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
  provider: 'mcp' | 'composio';
  toolkitId?: string; // For Composio
}

/**
 * Detects if any tool call steps contain OAuth authentication errors
 * and extracts the server/toolkit information
 */
export function detectOAuthErrorInSteps(steps: ConversationRoundStep[]): OAuthErrorInfo {
  for (const step of steps) {
    if (isToolCallStep(step)) {
      // Check if any result is an OAuth error
      for (const result of step.results) {
        if (result.type === ToolResultType.error) {
          const message = result.data.message || '';
          const toolId = step.tool_id;
          
          // Check for MCP OAuth error
          if (message.includes('OAuth authentication required for MCP server')) {
            // Extract server name from error message
            const serverNameMatch = message.match(
              /OAuth authentication required for MCP server "([^"]+)"/
            );
            const serverName = serverNameMatch ? serverNameMatch[1] : 'Unknown Server';
            
            // Extract serverId from tool ID (format: mcp.{serverId}.{toolName})
            if (toolId && toolId.startsWith('mcp.')) {
              const toolParts = toolId.split('.');
              const serverId = toolParts.length >= 3 ? toolParts[1] : undefined;
              
              if (serverId) {
                return {
                  hasOAuthError: true,
                  serverName,
                  serverId,
                  provider: 'mcp',
                };
              }
            }
          }
          
          // Check for Composio authentication error
          if (message.includes('Composio authentication required for toolkit')) {
            // Extract toolkit name from error message
            const toolkitNameMatch = message.match(
              /Composio authentication required for toolkit "([^"]+)"/
            );
            const serverName = toolkitNameMatch ? toolkitNameMatch[1] : 'Unknown Toolkit';
            
            // Extract toolkitId from tool ID (format: composio.{toolkitId}.{actionName})
            if (toolId && toolId.startsWith('composio.')) {
              const toolParts = toolId.split('.');
              const toolkitId = toolParts.length >= 3 ? toolParts[1] : undefined;
              
              if (toolkitId) {
                return {
                  hasOAuthError: true,
                  serverName,
                  toolkitId,
                  provider: 'composio',
                };
              }
            }
          }
        }
      }
    }
  }
  
  return { hasOAuthError: false, provider: 'mcp' };
}

