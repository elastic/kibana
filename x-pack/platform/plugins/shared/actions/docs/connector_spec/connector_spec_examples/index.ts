/**
 * Stack Connectors 2.0 - Real-World Example Implementations
 * 
 * This directory contains example implementations of actual connectors
 * from the Kibana stack_connectors plugin, demonstrating various
 * patterns and features of the specification.
 * 
 * All examples are based on real connectors - no synthetic examples.
 */

// Re-export all real connector examples
export { SlackApiConnectorExample } from "./slack_api";
export { WebhookConnectorExample } from "./webhook";
export { OpenAIConnectorExample } from "./openai";
export { BedrockConnectorExample } from "./bedrock";
export { JiraConnectorExample } from "./jira";
export { D3SecurityConnectorExample } from "./d3security";

