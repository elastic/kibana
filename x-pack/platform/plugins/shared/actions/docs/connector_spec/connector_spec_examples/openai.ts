/**
 * Example: OpenAI Connector
 * 
 * This demonstrates an AI connector with advanced features including:
 * - Multiple provider support (OpenAI, Azure AI, Other)
 * - Streaming responses for real-time generation
 * - Function calling / tool use
 * - SSL/PKI certificate authentication for custom providers
 * - Model configuration per provider
 * 
 * REFERENCE: Based on actual OpenAI connector
 * FILE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/
 */

import { z } from "zod";
import type { SingleFileConnectorDefinition } from "../connector_spec";
import { withUIMeta, UISchemas } from "../connector_spec_ui";

export const OpenAIConnectorExample: SingleFileConnectorDefinition = {
  // ---- Metadata (required) ----
  metadata: {
    id: ".gen-ai",
    displayName: "OpenAI",
    icon: "logoOpenAI",
    description: "OpenAI, Azure OpenAI, and compatible services with streaming and function calling",
    docsUrl: "https://platform.openai.com/docs/api-reference",
    minimumLicense: "enterprise",
    supportedFeatureIds: [
      "generativeAIForSecurity",
      "generativeAIForObservability", 
      "generativeAIForSearchPlayground"
    ],
  },
  
  // ---- Policies (optional) ----
  policies: {
    // Streaming support for real-time token generation
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/openai.ts:231-289
    // WHY: AI responses can be long, streaming provides better UX
    streaming: {
      enabled: true,
      mechanism: "sse", // Server-sent events
      parser: "ndjson", // OpenAI's NDJSON format with delta tokens
    },
  },
  
  // ---- Auth Schema (required) ----
  // WHY: Different providers require different auth and configuration
  schema: z.discriminatedUnion("method", [
    // 1. OpenAI (official)
    z.object({
      method: z.literal("openai"),
      apiKey: UISchemas.secret("sk-...").describe("API Key"),
      organizationId: z.string()
        .optional()
        .describe("Organization ID"),
      projectId: z.string()
        .optional()
        .describe("Project ID"),
      apiUrl: UISchemas.url("https://api.openai.com/v1")
        .describe("API URL"),
      defaultModel: z.string()
        .default("gpt-4o")
        .describe("Default Model"),
    }),
    
    // 2. Azure OpenAI
    z.object({
      method: z.literal("azure_ai"),
      apiKey: UISchemas.secret().describe("API Key"),
      apiUrl: withUIMeta(
        UISchemas.url(),
        {
          helpText: "Azure OpenAI resource endpoint (e.g., https://<resource>.openai.azure.com)",
        }
      ).describe("Azure Endpoint"),
    }),
    
    // 3. Other (custom OpenAI-compatible providers)
    z.object({
      method: z.literal("other"),
      apiKey: z.string()
        .optional()
        .describe("API Key"),
      apiUrl: UISchemas.url().describe("API URL"),
      defaultModel: z.string().describe("Default Model"),
      // Optional SSL/PKI for secure custom providers
      certificateAuth: z.object({
        certificate: withUIMeta(
          z.string(),
          {
            widget: "textarea",
            widgetOptions: { rows: 8 },
          }
        ).optional().describe("Certificate (PEM)"),
        privateKey: withUIMeta(
          z.string(),
          {
            sensitive: true,
            widget: "textarea",
            widgetOptions: { rows: 8 },
          }
        ).optional().describe("Private Key"),
        ca: withUIMeta(
          z.string(),
          {
            widget: "textarea",
            widgetOptions: { rows: 5 },
          }
        ).optional().describe("CA Certificate"),
        verificationMode: z.enum(["full", "certificate", "none"])
          .default("full")
          .describe("Verification Mode"),
      }).optional(),
      enableNativeFunctionCalling: z.boolean()
        .optional()
        .default(false)
        .describe("Enable Native Function Calling"),
    }),
  ]),
  
  // URL allowlist validation (framework-enforced)
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/index.ts:62-92
  // Note: The auth schema's apiUrl field is validated by the framework's allowlist
  validateUrls: {
    fields: [], // No config URLs, auth URLs validated separately
  },
  
  // ---- Actions (required) ----
  actions: {
    // Action 1: Run completion (non-streaming)
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/common/openai/schema.ts:68-76
    run: {
      actionGroup: "AI Generation",
      description: "Run AI completion (non-streaming)",
      isTool: false, // Internal use only
      
      input: z.object({
        body: withUIMeta(
          UISchemas.json(),
          {
            helpText: "OpenAI API request body (JSON)",
            docsUrl: "https://platform.openai.com/docs/api-reference/chat/create",
          }
        ).describe("Request Body"),
        
        timeout: z.number()
          .int()
          .positive()
          .optional()
          .default(60000)
          .describe("Timeout (ms)"),
      }),
      
      handler: async (ctx, input) => {
        // Make non-streaming request to OpenAI API
        // Parse response and return structured data
        return {
          id: "chatcmpl-123",
          object: "chat.completion",
          created: Date.now(),
          model: "gpt-4o",
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
          choices: [{
            message: {
              role: "assistant",
              content: "Response text",
            },
            finish_reason: "stop",
            index: 0,
          }],
        };
      },
    },
    
    // Action 2: Stream completion (real-time)
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/common/openai/schema.ts:195-204
    stream: {
      actionGroup: "AI Generation",
      description: "Stream AI completion in real-time",
      isTool: false,
      supportsStreaming: true, // Marks this as a streaming action
      
      input: z.object({
        body: UISchemas.json().describe("Request Body"),
        stream: z.boolean().default(true).describe("Enable Streaming"),
        timeout: z.number().optional().describe("Timeout (ms)"),
      }),
      
      handler: async (ctx, input) => {
        // Return a stream of SSE chunks
        // Each chunk: data: {"choices":[{"delta":{"content":"token"}}]}\n\n
        return {
          stream: true, // Signal this is a streaming response
        };
      },
    },
    
    // Action 3: Invoke AI (high-level)
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/common/openai/schema.ts:111-183
    invokeAI: {
      actionGroup: "AI Generation",
      description: "Invoke AI with structured parameters",
      isTool: true, // Can be used in workflows
      
      input: z.object({
        messages: z.array(
          z.object({
            role: z.enum(["system", "user", "assistant", "function", "tool"]),
            content: z.string(),
            name: z.string().optional(),
          })
        ).describe("Messages"),
        
        model: z.string()
          .optional()
          .describe("Model Override"),
        
        // Function calling / tools
        tools: z.array(
          z.object({
            type: z.literal("function"),
            function: z.object({
              name: z.string(),
              description: z.string().optional(),
              parameters: z.object({}).passthrough(),
            }),
          })
        ).optional().describe("Tools"),
        
        tool_choice: z.union([
          z.literal("none"),
          z.literal("auto"),
          z.literal("required"),
          z.object({
            type: z.literal("function"),
            function: z.object({ name: z.string() }),
          }),
        ]).optional().describe("Tool Choice"),
        
        temperature: z.number()
          .min(0)
          .max(2)
          .optional()
          .describe("Temperature"),
        
        stop: z.union([
          z.string(),
          z.array(z.string()),
        ]).optional().describe("Stop Sequences"),
        
        response_format: z.object({
          type: z.enum(["text", "json_object"]),
        }).optional().describe("Response Format"),
      }),
      
      handler: async (ctx, input) => {
        // High-level AI invocation with automatic retry and error handling
        return {
          message: "AI response message",
          usage: {
            prompt_tokens: 15,
            completion_tokens: 25,
            total_tokens: 40,
          },
        };
      },
    },
    
    // Action 4: Test connectivity
    test: {
      input: z.object({}),
      handler: async (ctx) => {
        // Simple request to verify credentials
        return {
          ok: true,
          message: "Successfully connected to OpenAI",
        };
      },
    },
  },
  
  // ---- Test Function (optional) ----
  test: {
    handler: async (ctx) => {
      // Verify API key and endpoint
      return {
        ok: true,
        message: "Successfully connected to OpenAI API",
        method: ctx.auth.method,
      };
    },
    description: "Verifies API credentials and connectivity",
  },
};

