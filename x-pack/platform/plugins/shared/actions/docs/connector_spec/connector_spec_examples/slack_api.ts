/**
 * Example: Slack API Connector
 * 
 * This demonstrates how the spec would be used in practice with the new
 * UI derivability features. Notice how:
 * 
 * 1. UI is fully derived from Zod schemas
 * 2. Minimal metadata for special cases (sensitive fields, dynamic options)
 * 3. No separate UI definition needed
 * 4. LLM-friendly: just define schemas and handlers
 * 
 * REFERENCE: Based on actual Slack API connector
 * FILE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/slack_api/
 */

import { z } from "zod";
import type { SingleFileConnectorDefinition } from "../connector_spec";
import { withUIMeta, UISchemas } from "../connector_spec_ui";

export const SlackApiConnectorExample: SingleFileConnectorDefinition = {
  // ---- Metadata (required) ----
  metadata: {
    id: ".slack_api",
    displayName: "Slack",
    icon: "slack",
    description: "Slack Web API & Incoming Webhooks",
    docsUrl: "https://api.slack.com/",
    minimumLicense: "gold",
    supportedFeatureIds: ["alerting", "uptime", "security"],
  },
  
  // ---- Single Schema (required) ----
  // WHY: Discriminated union lets UI render different forms per auth method
  // "headers" method shows token field, "webhook" method shows URL field
  schema: z.discriminatedUnion("method", [
    z.object({
      method: z.literal("headers"),
      fields: z.object({
        // UI derives: password input (sensitive), with placeholder
        Authorization: withUIMeta(
          z.string(),
          {
            sensitive: true, // Makes this a password field
            placeholder: "Bearer xoxb-...",
            helpText: "Get your token from https://api.slack.com/apps",
          }
        ).describe("Bearer Token"), // Label comes from .describe()
      }),
    }),
    z.object({
      method: z.literal("webhook"),
      fields: z.object({
        // UI derives: URL input with validation
        url: UISchemas.url("https://hooks.slack.com/services/...")
          .describe("Webhook URL"),
        // UI derives: key-value editor (z.record())
        extraHeaders: z.record(z.string())
          .optional()
          .describe("Additional Headers"),
      }),
    }),
  ]),
  
  // ---- Policies (optional) ----
  // WHY: Slack has specific rate limiting and pagination patterns
  policies: {
    rateLimit: {
      strategy: "header",
      codes: [429, 503],
      remainingHeader: "x-ratelimit-remaining",
      resetHeader: "x-ratelimit-reset",
    },
    pagination: {
      strategy: "cursor",
      parameterLocation: "query_params",
      resultPath: "channels",  // Slack wraps results in a field (e.g., "channels", "members", etc.)
      cursorParam: "cursor",
      cursorPath: "response_metadata.next_cursor",
      pageSizeParam: "limit",
    },
  },
  
  // ---- Actions (required) ----
  // WHY: Each action's input schema automatically generates parameter form
  actions: {
    // Action 1: Post a message
    postMessage: {
      actionGroup: "Messages",
      description: "Post a message to a Slack channel",
      isTool: true, // Can be used by LLMs
      
      // Input schema - UI fully derived from this
      input: z.object({
        // UI derives: Dropdown with channels loaded from getChannels action
        channel: withUIMeta(
          z.string(),
          {
            widget: "select",
            optionsFrom: {
              action: "getChannels", // Loads options from another action
              map: (result: any) =>
                result.channels.map((c: any) => ({
                  value: c.id,
                  label: `#${c.name}`,
                })),
              cacheDuration: 300, // Cache for 5 minutes
            },
            helpText: "Select a channel to post to, or enter a channel ID",
          }
        ).describe("Channel"),
        
        // UI derives: Multi-line textarea (5 rows)
        text: withUIMeta(
          z.string().min(1),
          {
            widget: "textarea",
            widgetOptions: { rows: 5 },
            placeholder: "Enter your message here...",
          }
        ).describe("Message Text"),
      }),
      
      // Handler implementation
      handler: async (ctx, input) => {
        const typedInput = input as { channel: string; text: string };
        if (ctx.auth.method !== "headers") {
          throw new Error("postMessage requires headers auth");
        }
        // Implementation would make actual API call
        return {
          ts: "1234567890.123456",
          channel: typedInput.channel,
          ok: true,
        };
      },
    },
    
    // Action 2: Get channels list (used by postMessage for options)
    getChannels: {
      actionGroup: "Channels",
      description: "List all Slack channels",
      // No parameters needed - UI shows empty form
      input: z.object({
        // UI derives: Number input with validation
        limit: z.number()
          .int()
          .positive()
          .max(1000)
          .optional()
          .default(100)
          .describe("Maximum Channels"),
      }),
      
      handler: async (ctx, input) => {
        if (ctx.auth.method !== "headers") {
          throw new Error("getChannels requires headers auth");
        }
        // Implementation would fetch and paginate channels
        return {
          channels: [
            { id: "C123", name: "general" },
            { id: "C456", name: "random" },
          ],
        };
      },
    },
    
    // Action 3: Search channels
    searchChannels: {
      actionGroup: "Channels",
      description: "Search for Slack channels by name",
      input: z.object({
        // UI derives: Text input with validation
        query: z.string()
          .min(1)
          .describe("Search Query"),
        
        limit: z.number()
          .int()
          .positive()
          .optional()
          .default(100)
          .describe("Max Results"),
      }),
      
      handler: async (ctx, input) => {
        // Implementation would search channels
        return {
          results: [],
        };
      },
    },
    
    // UI will automatically group these actions:
    // 📬 Messages
    //   └─ postMessage
    // 📁 Channels
    //   ├─ getChannels
    //   └─ searchChannels
  },
  
  // ---- Test Function (optional but recommended) ----
  // WHY: Validates that auth credentials work
  test: {
    handler: async (ctx) => {
      if (ctx.auth.method === "headers") {
        // Test API call
        return {
          ok: true,
          message: "Successfully connected to Slack",
          user: "user@example.com",
          team: "Example Team",
        };
      }
      if (ctx.auth.method === "webhook") {
        // Webhooks are fire-and-forget, can't really test
        return {
          ok: true,
          message: "Webhook URL configured",
        };
      }
      return { ok: false, message: "Unknown auth method" };
    },
    description: "Verifies Slack API credentials",
  },
};

