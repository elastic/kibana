/**
 * Example: Amazon Bedrock Connector
 * 
 * ⚠️ PHASE 2 ONLY - NOT SUPPORTED IN PHASE 1
 * This connector uses AWS SigV4 authentication which is not part of Phase 1.
 * Phase 1 only supports: Header, Basic, Bearer auth.
 * 
 * This demonstrates an AWS service connector with:
 * - AWS Signature v4 authentication (PHASE 2)
 * - Streaming support for AI responses
 * - Tool calling (Claude-specific format)
 * - Multiple model support (Claude, Titan, etc.)
 * 
 * REFERENCE: Based on actual Bedrock connector
 * FILE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/
 */

import { z } from "zod";
import type { SingleFileConnectorDefinition } from "../connector_spec";
import { withUIMeta, UISchemas } from "../connector_spec_ui";

export const BedrockConnectorExample: SingleFileConnectorDefinition = {
  // ---- Metadata (required) ----
  metadata: {
    id: ".bedrock",
    displayName: "Amazon Bedrock",
    icon: "logoAWS",
    description: "Amazon Bedrock foundation models (Claude, Titan, etc.)",
    docsUrl: "https://docs.aws.amazon.com/bedrock/",
    minimumLicense: "enterprise",
    supportedFeatureIds: [
      "generativeAIForSecurity",
      "generativeAIForObservability",
      "generativeAIForSearchPlayground"
    ],
  },
  
  // ---- Special Capabilities ----
  capabilities: {
    // Tool calling (Claude models)
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/common/bedrock/schema.ts:97-111
    // WHY: Claude models support tool use
    functionCalling: {
      supported: true,
      format: "anthropic", // Claude/Anthropic tool format
      toolUseEnabled: true,
    },
  },
  
  // ---- Policies (optional) ----
  policies: {
    // Streaming support via AWS SDK
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/bedrock.ts:291-356
    // WHY: Bedrock supports streaming for real-time AI responses
    streaming: {
      enabled: true,
      mechanism: "chunked", // Uses AWS SDK chunked transfer encoding
      parser: "json", // Bedrock's JSON streaming format
    },
  },
  
  // ---- Auth Schema (required) ----
  // ⚠️ PHASE 2: AWS SigV4 auth not supported in Phase 1
  // WHY: AWS services require SigV4 signing with access key and secret
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/common/bedrock/schema.ts:28-33
  schema: z.discriminatedUnion("method", [
    z.object({
      method: z.literal("aws_sig_v4"), // PHASE 2 ONLY
      credentials: z.object({
        accessKey: withUIMeta(
          z.string(),
          {
            helpText: "AWS IAM access key ID",
            placeholder: "AKIAIOSFODNN7EXAMPLE",
          }
        ).describe("Access Key ID"),
        
        secretKey: withUIMeta(
          UISchemas.secret(),
          {
            helpText: "AWS IAM secret access key",
          }
        ).describe("Secret Access Key"),
        
        // AWS region is inferred from API URL, not separate field
      }),
    }),
  ]),
  
  // URL allowlist validation (framework-enforced)
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/index.ts:43-59
  validateUrls: {
    fields: ["apiUrl"],
  },
  
  // ---- Actions (required) ----
  actions: {
    // Action 1: Run completion (non-streaming)
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/common/bedrock/schema.ts:35-45
    run: {
      actionGroup: "Advanced",
      description: "Low-level API access for Bedrock",
      isTool: false,
      
      input: z.object({
        body: withUIMeta(
          UISchemas.json(),
          {
            helpText: "Bedrock API request body (JSON)",
            docsUrl: "https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html",
          }
        ).describe("Request Body"),
        
        model: z.string()
          .optional()
          .describe("Model Override"),
        
        timeout: z.number()
          .optional()
          .default(120000) // Bedrock can be slower
          .describe("Timeout (ms)"),
      }),
      
      handler: async (ctx, input) => {
        // Implementation:
        // 1. Parse model ID from input or use default
        // 2. Sign request with AWS SigV4
        // 3. Make request to Bedrock runtime
        // 4. Parse response based on model provider
        
        return {
          completion: "AI generated text response",
          stop_reason: "end_turn",
          usage: {
            input_tokens: 10,
            output_tokens: 20,
          },
        };
      },
    },
    
    // Action 2: Invoke AI (high-level with messages)
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/common/bedrock/schema.ts:85-111
    invokeAI: {
      actionGroup: "AI Generation",
      description: "Invoke AI with structured parameters",
      isTool: true,
      
      input: z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string().optional(),
            // Bedrock supports rich content (images, etc.)
            rawContent: z.array(z.any()).optional(),
          })
        ).describe("Messages"),
        
        model: z.string()
          .optional()
          .describe("Model Override"),
        
        system: z.string()
          .optional()
          .describe("System Prompt"),
        
        temperature: z.number()
          .min(0)
          .max(1)
          .optional()
          .describe("Temperature"),
        
        maxTokens: z.number()
          .int()
          .positive()
          .optional()
          .default(512)
          .describe("Max Tokens"),
        
        stopSequences: z.array(z.string())
          .optional()
          .describe("Stop Sequences"),
        
        // Tool calling (Claude-specific)
        tools: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            input_schema: z.object({}).passthrough(),
          })
        ).optional().describe("Tools"),
        
        toolChoice: z.object({
          type: z.enum(["auto", "any", "tool"]),
          name: z.string().optional(),
        }).optional().describe("Tool Choice"),
      }),
      
      handler: async (ctx, input) => {
        // High-level message-based invocation
        // Automatically handles AWS SigV4 signing
        return {
          message: "AI response",
          usage: {
            input_tokens: 15,
            output_tokens: 25,
          },
        };
      },
    },
    
    // Action 3: Converse (unified API for all models)
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/common/bedrock/schema.ts:198-216
    converse: {
      actionGroup: "AI Generation",
      description: "Converse API for multi-turn conversations",
      isTool: true,
      
      input: z.object({
        messages: z.array(z.any()).describe("Messages"),
        model: z.string().optional().describe("Model"),
        system: z.array(z.any()).optional().describe("System"),
        temperature: z.number().optional().describe("Temperature"),
        maxTokens: z.number().optional().describe("Max Tokens"),
        stopSequences: z.array(z.string()).optional().describe("Stop Sequences"),
        tools: z.array(z.any()).optional().describe("Tools"),
        toolChoice: z.any().optional().describe("Tool Choice"),
      }),
      
      handler: async (ctx, input) => {
        // Uses Bedrock's Converse API (model-agnostic)
        return {
          output: {
            message: {
              role: "assistant",
              content: [{ text: "Response" }],
            },
          },
          usage: {
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
          },
        };
      },
    },
    
    // Action 4: Converse Stream
    converseStream: {
      actionGroup: "AI Generation",
      description: "Stream Converse API responses in real-time",
      isTool: true,
      supportsStreaming: true,
      
      input: z.object({
        messages: z.array(z.any()).describe("Messages"),
        model: z.string().optional().describe("Model"),
        // ... same as converse
      }),
      
      handler: async (ctx, input) => {
        // Streaming version of Converse API
        return {
          stream: true,
        };
      },
    },
  },
  
  // ---- Test Function (optional) ----
  test: {
    handler: async (ctx) => {
      // Verify AWS credentials and Bedrock access
      // Make a minimal request to test auth
      return {
        ok: true,
        message: "Successfully connected to Amazon Bedrock",
        region: "us-east-1", // Extracted from apiUrl
      };
    },
    description: "Verifies AWS credentials and Bedrock access",
  },
};

