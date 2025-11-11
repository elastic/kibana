/**
 * Example: Webhook Connector
 * 
 * This demonstrates a generic webhook connector with multiple authentication
 * options and HTTP methods. Shows how to:
 * 
 * 1. Support multiple auth methods (Basic, SSL/mTLS, Custom Headers)
 * 2. Handle different HTTP methods (POST, PUT, GET, etc.)
 * 3. Use conditional fields based on auth selection
 * 4. Implement SSL certificate authentication
 * 
 * REFERENCE: Based on actual Webhook connector
 * FILE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/webhook/
 */

import { z } from "zod";
import type { SingleFileConnectorDefinition } from "../connector_spec";
import { withUIMeta, UISchemas } from "../connector_spec_ui";

export const WebhookConnectorExample: SingleFileConnectorDefinition = {
  // ---- Metadata (required) ----
  metadata: {
    id: ".webhook",
    displayName: "Webhook",
    icon: "logoWebhook",
    description: "Send HTTP requests to any web service",
    docsUrl: "https://www.elastic.co/guide/en/kibana/current/webhook-action-type.html",
    minimumLicense: "gold",
    supportedFeatureIds: ["alerting", "uptime", "security", "cases"],
  },
  
  // ---- Single Schema (required) ----
  // WHY: Demonstrates discriminated union with multiple auth options
  // User can choose from: None, Basic Auth, SSL/mTLS, or Custom Headers
  schema: z.discriminatedUnion("method", [
    // 1. No Authentication
    z.object({
      method: z.literal("none"),
    }),
    
    // 2. Basic Authentication
    z.object({
      method: z.literal("basic"),
      credentials: z.object({
        username: z.string().describe("Username"),
        password: UISchemas.secret().describe("Password"),
      }),
    }),
    
    // 3. SSL/mTLS Certificate Authentication
    z.object({
      method: z.literal("ssl"),
      certificate: z.discriminatedUnion("type", [
        // CRT + Key option
        z.object({
          type: z.literal("crt"),
          cert: withUIMeta(
            z.string(),
            {
              widget: "textarea",
              widgetOptions: { rows: 10 },
              placeholder: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
              helpText: "Base64-encoded certificate (PEM format)",
            }
          ).describe("Certificate"),
          key: withUIMeta(
            z.string(),
            {
              sensitive: true,
              widget: "textarea",
              widgetOptions: { rows: 10 },
              placeholder: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
              helpText: "Base64-encoded private key",
            }
          ).describe("Private Key"),
          passphrase: UISchemas.secret().optional().describe("Passphrase"),
          ca: withUIMeta(
            z.string(),
            {
              widget: "textarea",
              widgetOptions: { rows: 5 },
              placeholder: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
            }
          ).optional().describe("CA Certificate"),
          verificationMode: z.enum(["none", "certificate", "full"])
            .default("full")
            .describe("Verification Mode"),
        }),
        // PFX bundle option
        z.object({
          type: z.literal("pfx"),
          pfx: withUIMeta(
            z.string(),
            {
              sensitive: true,
              widget: "textarea",
              widgetOptions: { rows: 10 },
              helpText: "Base64-encoded PFX/PKCS12 bundle",
            }
          ).describe("PFX Bundle"),
          passphrase: UISchemas.secret().describe("Passphrase"),
          ca: withUIMeta(
            z.string(),
            {
              widget: "textarea",
              widgetOptions: { rows: 5 },
            }
          ).optional().describe("CA Certificate"),
          verificationMode: z.enum(["none", "certificate", "full"])
            .default("full")
            .describe("Verification Mode"),
        }),
      ]),
    }),
    
    // 4. Custom Headers Authentication
    z.object({
      method: z.literal("headers"),
      headers: withUIMeta(
        z.record(z.string(), z.string()),
        {
          widget: "keyValue",
          helpText: "Custom headers (e.g., Authorization, X-API-Key)",
        }
      ).describe("Headers"),
    }),
  ]),
  
  // ---- Validation (required) ----
  validation: {
    configSchema: z.object({
      // URL is always required
      url: UISchemas.url().describe("Webhook URL"),
      
      // HTTP method selection
      method: z.enum(["POST", "PUT", "PATCH", "GET", "DELETE"])
        .default("POST")
        .describe("HTTP Method"),
      
      // Optional default headers (can be overridden per request)
      defaultHeaders: withUIMeta(
        z.record(z.string(), z.string()),
        {
          widget: "keyValue",
          helpText: "Default headers applied to all requests",
        }
      ).optional().describe("Default Headers"),
      
      // Timeout configuration
      timeout: withUIMeta(
        z.number().int().positive().max(300000),
        {
          helpText: "Request timeout in milliseconds (max: 5 minutes)",
        }
      ).default(60000).describe("Timeout (ms)"),
    }).strict(),
    
    secretsSchema: z.object({}),
  },
  
  // ---- Policies (optional) ----
  policies: {
    retry: {
      retryOnStatusCodes: [429, 500, 502, 503, 504],
      maxRetries: 3,
      backoffStrategy: "exponential",
      initialDelay: 1000,
    },
  },
  
  // ---- Actions (required) ----
  actions: {
    // Single action: execute webhook
    execute: {
      isTool: true, // Can be used in automation workflows
      
      input: z.object({
        // Request body (optional for GET/DELETE)
        body: withUIMeta(
          z.string(),
          {
            widget: "json",
            helpText: "Request body (JSON, XML, or plain text)",
            when: {
              field: "method",
              is: "GET",
              then: "hide", // Hide body field for GET requests
            },
          }
        ).optional().describe("Body"),
        
        // Override headers for this specific request
        headers: withUIMeta(
          z.record(z.string(), z.string()),
          {
            widget: "keyValue",
            helpText: "Request-specific headers (merged with default headers)",
          }
        ).optional().describe("Headers"),
        
        // Query parameters
        params: withUIMeta(
          z.record(z.string(), z.string()),
          {
            widget: "keyValue",
            helpText: "URL query parameters",
          }
        ).optional().describe("Query Parameters"),
      }),
      
      handler: async (ctx, input) => {
        // Implementation would:
        // 1. Merge default headers with request headers
        // 2. Apply authentication based on auth method
        // 3. Make HTTP request with configured method
        // 4. Return response
        
        return {
          status: 200,
          statusText: "OK",
          data: { success: true },
          headers: {},
        };
      },
      
      description: "Send HTTP request to the configured webhook URL",
    },
  },
  
  // ---- Test Function (optional but recommended) ----
  test: {
    handler: async (ctx) => {
      // Test by making a simple request to the webhook URL
      // Validates:
      // - URL is reachable
      // - Authentication works
      // - SSL/TLS certificate is valid (if applicable)
      
      return {
        ok: true,
        message: "Successfully connected to webhook",
        statusCode: 200,
      };
    },
    description: "Verifies webhook URL is reachable with configured authentication",
  },
};

