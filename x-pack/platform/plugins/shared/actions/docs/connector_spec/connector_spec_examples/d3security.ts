/**
 * D3 Security Connector Example
 * 
 * DEMONSTRATES:
 * - Custom headers authentication (d3key)
 * - Mustache template rendering for request body
 * - Simple event posting to security platform
 * - URL allowlist validation
 * - Severity levels for security events
 * 
 * REAL IMPLEMENTATION:
 * x-pack/platform/plugins/shared/stack_connectors/server/connector_types/d3security/
 */

import { z } from "zod";
import type { SingleFileConnectorDefinition } from "../connector_spec";
import { UISchemas, withUIMeta } from "../connector_spec_ui";

export const D3SecurityConnectorExample: SingleFileConnectorDefinition = {
  // ---- Metadata ----
  metadata: {
    id: ".d3security",
    displayName: "D3 Security",
    description: "Send security events to D3 Security SOAR platform",
    minimumLicense: "gold",
    supportedFeatureIds: ["alerting", "security"],
    
    // Documentation
    docsUrl: "https://www.d3security.com/",
  },

  // ---- Authentication ----
  // D3 Security uses a custom "d3key" header for authentication
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/d3security/d3security.ts:76
  //   Code: `headers: { d3key: this.token || '' }`
  schema: z.discriminatedUnion("method", [
    z.object({
      method: z.literal("headers"),
      headers: z.object({
        d3key: withUIMeta(
          z.string(),
          {
            sensitive: true,
            widget: "password",
            placeholder: "your-d3-api-key",
            helpText: "API key for D3 Security platform authentication",
            docsUrl: "https://www.d3security.com/",
          }
        ).describe("D3 Security API Key"),
      }),
    }),
  ]),

  // URL allowlist validation
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/d3security/index.ts:30
  //   Code: `validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }]`
  validateUrls: {
    fields: ["url"],
  },

  // ---- Policies ----
  policies: {
    retry: {
      retryOnStatusCodes: [429, 500, 502, 503, 504],
      maxRetries: 3,
    },
    
    // Error handling
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/d3security/d3security.ts:52-60
    error: {
      classifyError: (error: { status?: number; message?: string }) => {
        if (error.status === 401) {
          return "user"; // Unauthorized: Invalid API key
        }
        if (error.status && error.status >= 500) {
          return "system"; // Server errors
        }
        return "unknown";
      },
    },
  },

  // ---- Actions ----
  actions: {
    // Action 1: Run - Send security event to D3
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/d3security/d3security.ts:62-81
    run: {
      actionGroup: "Security Events",
      description: "Send security event to D3 SOAR platform",
      isTool: true,
      
      // Input schema
      // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/common/d3security/schema.ts:21-27
      input: z.object({
        body: withUIMeta(
          z.string(),
          {
            widget: "json",
            helpText: "Event data in JSON format. Supports Mustache templating.",
            section: "Event Details",
          }
        ).describe("Event Body (JSON)"),
        
        severity: withUIMeta(
          z.enum(["high", "medium", "low", ""]).default(""),
          {
            widget: "select",
            helpText: "Severity level for the security event",
            section: "Event Details",
          }
        ).describe("Severity").optional(),
        
        eventType: withUIMeta(
          z.string().default(""),
          {
            widget: "text",
            placeholder: "phishing, malware, intrusion, etc.",
            helpText: "Type of security event",
            section: "Event Details",
          }
        ).describe("Event Type").optional(),
      }),
      
      // Handler implementation
      handler: async (ctx, input) => {
        // Cast input to expected type
        const typedInput = input as { body: string; severity?: string; eventType?: string };
        
        // Render Mustache templates in body
        // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/d3security/render.ts:13-27
        //   Code: `body: renderMustacheString(logger, params.subActionParams.body as string, variables, 'json')`
        const renderedBody = typedInput.body; // In real impl, would render Mustache templates
        
        // Add severity and event type to body
        // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/d3security/d3security.ts:71-75
        //   Code: `addSeverityAndEventTypeInBody(body ?? '', severity ?? D3SecuritySeverity.EMPTY, eventType ?? '')`
        let eventData: any = {};
        try {
          eventData = JSON.parse(renderedBody);
        } catch (e) {
          eventData = { raw: renderedBody };
        }
        
        if (typedInput.severity) {
          eventData.severity = typedInput.severity;
        }
        if (typedInput.eventType) {
          eventData.eventType = typedInput.eventType;
        }
        
        // Send event to D3 Security
        // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/d3security/d3security.ts:66-80
        if (!ctx.client) {
          throw new Error("HTTP client not available");
        }
        const url = (ctx.config?.url as string) || "";
        const response = await ctx.client.post(url, eventData);
        
        // Response format
        // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/common/d3security/schema.ts:29-31
        //   Code: `D3SecurityRunActionResponseSchema = z.object({ refid: z.string() })`
        return {
          refid: response.data.refid || "unknown",
          success: true,
        };
      },
    },
    
    // Action 2: Test - Verify connectivity
    // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/d3security/d3security.ts:38-49
    //   Code: Both run and test use the same method
    test: {
      input: z.object({}),
      
      handler: async (ctx) => {
        // Send a minimal test event
        const testEvent = {
          body: JSON.stringify({
            test: true,
            message: "D3 Security connector test",
            timestamp: new Date().toISOString(),
          }),
          severity: "low",
          eventType: "test",
        };
        
        try {
          if (!ctx.client) {
            throw new Error("HTTP client not available");
          }
          const url = (ctx.config?.url as string) || "";
          const response = await ctx.client.post(url, {
            test: true,
            message: "D3 Security connector test",
            severity: "low",
            eventType: "test",
          });
          
          return {
            ok: true,
            message: "Successfully connected to D3 Security",
            refid: response.data.refid,
          };
        } catch (error: any) {
          return {
            ok: false,
            message: `Connection failed: ${error.message}`,
          };
        }
      },
    },
  },

  // ---- Test Function ----
  test: {
    handler: async (ctx) => {
      // Use the test action
      try {
        if (!ctx.client) {
          return {
            ok: false,
            message: "HTTP client not available",
          };
        }
        const url = (ctx.config?.url as string) || "";
        const response = await ctx.client.post(url, {
          test: true,
          message: "Connection test",
          severity: "low",
          eventType: "test",
        });
        
        return {
          ok: true,
          message: "Successfully connected to D3 Security",
        };
      } catch (error: any) {
        if (error.response?.status === 401) {
          return {
            ok: false,
            message: "Authentication failed: Invalid API key",
          };
        }
        return {
          ok: false,
          message: `Connection failed: ${error.message}`,
        };
      }
    },
    description: "Verifies D3 Security API connectivity and authentication",
  },

  // ---- Request/Response Transformations ----
  transformations: {
    templates: {
      enabled: true,
      format: "mustache",
      escaping: "json",
      // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/d3security/render.ts
      //   Code: Mustache rendering for body parameter with JSON escaping
    },
  },
};

/**
 * USAGE EXAMPLE:
 * 
 * // Send a phishing event
 * const result = await connector.run({
 *   body: JSON.stringify({
 *     source: "email_gateway",
 *     subject: "Suspicious email detected",
 *     from: "attacker@evil.com",
 *     to: "{{alert.user.email}}",
 *     indicators: ["malicious_url", "phishing_keywords"],
 *     timestamp: "{{alert.timestamp}}"
 *   }),
 *   severity: "high",
 *   eventType: "phishing"
 * });
 * 
 * // Response: { refid: "evt_123456", success: true }
 * 
 * 
 * KEY FEATURES:
 * 
 * 1. Custom Authentication Header:
 *    - Uses "d3key" header instead of standard Authorization
 *    
 * 2. Mustache Template Support:
 *    - Body parameter supports {{variable}} syntax
 *    - JSON escaping for safe template rendering
 *    
 * 3. Severity Levels:
 *    - high, medium, low, or empty
 *    - Added to event data automatically
 *    
 * 4. URL Allowlist Validation:
 *    - Ensures only approved D3 instances can be used
 *    - Security feature to prevent data exfiltration
 *    
 * 5. Simple Integration:
 *    - Single endpoint for all event types
 *    - Flexible JSON body format
 *    - Reference ID returned for tracking
 */

