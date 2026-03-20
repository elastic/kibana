/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';

const systemPrompt = `You are extracting **knowledge indicators** from log data to help set up monitoring and alerting rules.
Knowledge indicators are stable facts about real system components that are **explicitly supported by log evidence**.
Prioritize **correctness, deduplication, and actionable details**.

Extract knowledge indicators in five categories:

## Entity (Primary Focus)
High-level, stable system components identifiable from the log data.
- Subtypes: service, database, message_queue, cache, api_gateway, load_balancer, storage
- Focus on logical services/components, not individual pods, containers, or hosts
- Attach technology and infrastructure context in properties and meta

## Infrastructure
The environment and platform the system runs on.
- Subtypes: cloud_deployment, container_orchestration, operating_system, networking

## Technology
Languages, frameworks, libraries, and tools detected in the logs.
- Subtypes: programming_language, web_server, database_engine, logging_library, framework

## Dependency
Explicit relationships between components.
- Subtypes: service_dependency, database_connection, api_integration

## Schema
The log schema family evident from field names and structure.
- Subtypes: ecs, otel, custom
- Properties must include schema_family ("ecs" | "otel" | "custom")

## Required Fields

Every knowledge indicator MUST include:
- type (string): one of entity, infrastructure, technology, dependency, schema
- subtype (string): categorization within the type (e.g. service, database, cloud_deployment)
- id (string): unique concise identifier (e.g. "order-service", "aws-deployment")
- title (string): short human-readable title (e.g. "Order Service", "AWS")
- description (string): 1-4 sentence summary of what it represents
- properties (object): stable, low-cardinality key facts (MUST NOT be empty)
- confidence (number): 0-100
- evidence (array of strings): 2-5 supporting evidence snippets from logs
- tags (array of strings): descriptive tags

Optional:
- meta (object): supplementary high-cardinality or contextual information

## Rules

- Use snake_case for subtypes, put specificity in properties not subtype
- Use short hyphenated IDs (e.g. "api-service", "gcp-k8s")
- Confidence bands: 90-100 (explicit evidence), 70-89 (strong patterns), 50-69 (some ambiguity), 30-49 (inference, tag with "inferred")
- Do not emit duplicate (type, subtype, properties) tuples — merge evidence instead
- Prioritize entity identification first, then dependencies, then infrastructure/technology
- Prefer fewer, higher-confidence indicators over many speculative ones

## Examples

Entity:
{ "type": "entity", "subtype": "service", "id": "payment-service", "title": "Payment Service", "description": "Payment processing service built with Go", "properties": { "name": "payment", "technology": "go" }, "confidence": 88, "evidence": ["service.name=payment", "process.runtime.name=go"], "tags": ["entity", "service", "go"] }

Infrastructure:
{ "type": "infrastructure", "subtype": "container_orchestration", "id": "gcp-k8s", "title": "GKE Kubernetes", "description": "Google Kubernetes Engine cluster running workloads", "properties": { "platform": "gke", "provider": "gcp" }, "confidence": 92, "evidence": ["cloud.platform=gcp_kubernetes_engine", "k8s.namespace.name=default"], "tags": ["infrastructure", "kubernetes", "gcp"] }

Dependency:
{ "type": "dependency", "subtype": "service_dependency", "id": "checkout-payment-http", "title": "checkout → payment", "description": "HTTP dependency from checkout to payment service", "properties": { "source": "checkout", "target": "payment", "protocol": "http" }, "confidence": 78, "evidence": ["service.name=checkout upstream=payment:8080"], "tags": ["dependency", "http"] }

Schema:
{ "type": "schema", "subtype": "otel", "id": "otel-schema", "title": "OpenTelemetry", "description": "OpenTelemetry log schema detected from resource.attributes.* fields", "properties": { "schema_family": "otel" }, "confidence": 95, "evidence": ["resource.attributes.service.name", "resource.attributes.telemetry.sdk.version", "body.text"], "tags": ["schema", "otel"] }

Build one complete, deduplicated list, then call **finalize_knowledge_indicators** exactly once.`;

const userPromptTemplate = `\`sample_documents\`:
{{{sample_documents}}}

\`schema_summary\`:
{{{schema_summary}}}`;

const knowledgeIndicatorsSchema = {
  type: 'object',
  properties: {
    knowledge_indicators: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for the knowledge indicator.',
          },
          type: { type: 'string' },
          subtype: { type: 'string' },
          description: {
            type: 'string',
            description: 'A summary of what this indicator represents.',
          },
          title: {
            type: 'string',
            description: 'Short human-readable title.',
          },
          properties: {
            type: 'object',
            properties: {},
            minProperties: 1,
            description:
              'Core identifying properties (MUST NOT be empty). Stable, low-cardinality key facts.',
            additionalProperties: true,
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 100,
          },
          evidence: {
            type: 'array',
            items: { type: 'string' },
            description: 'Supporting evidence from logs (2-5 items).',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Descriptive tags.',
          },
          meta: {
            type: 'object',
            properties: {},
            description: 'Supplementary metadata.',
            additionalProperties: true,
          },
        },
        required: [
          'id',
          'type',
          'subtype',
          'description',
          'title',
          'properties',
          'confidence',
          'evidence',
          'tags',
        ],
      },
    },
  },
  required: ['knowledge_indicators'],
} as const;

export interface KnowledgeIndicator {
  id: string;
  type: string;
  subtype: string;
  title: string;
  description: string;
  properties: Record<string, unknown>;
  confidence: number;
  evidence: string[];
  tags: string[];
  meta?: Record<string, unknown>;
}

export function createKnowledgeIndicatorPrompt() {
  return createPrompt({
    name: 'extract_knowledge_indicators',
    input: z.object({
      sample_documents: z.string(),
      schema_summary: z.string(),
    }),
  })
    .version({
      system: {
        mustache: {
          template: systemPrompt,
        },
      },
      template: {
        mustache: {
          template: userPromptTemplate,
        },
      },
      tools: {
        finalize_knowledge_indicators: {
          description: 'Finalize knowledge indicator extraction',
          schema: knowledgeIndicatorsSchema,
        },
      },
    })
    .get();
}
