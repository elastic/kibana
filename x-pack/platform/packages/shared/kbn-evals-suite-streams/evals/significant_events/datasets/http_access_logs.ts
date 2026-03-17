/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GCS_BUCKET,
  HTTP_ACCESS_SYNTH_GCS_BASE_PATH_PREFIX,
  HTTP_ACCESS_SYNTH_NAMESPACE,
  HTTP_ACCESS_SYNTH_SNAPSHOT_NAME,
} from '../../../scripts/significant_events_snapshots/lib/constants';
import type { DatasetConfig } from './types';

// ---------------------------------------------------------------------------
// HTTP Access Logs (OTEL format) — Dataset Configuration
// ---------------------------------------------------------------------------
// Source data: Synthtrace HTTP access logs (OTEL format)
//   node scripts/synthtrace.js http_access_logs_otel.ts \
//     --from=2026-03-03T00:00:00Z --to=2026-03-03T01:00:00Z \
//     --scenarioOpts.scale=1 --scenarioOpts.mode=mixed
//
// GCS snapshot: gs://obs-ai-datasets/sigevents/http-access-synth/2026-03-03/
// Run with: SIGEVENTS_SNAPSHOT_RUN=2026-03-03 SIGEVENTS_DATASET=http-access-synth
//
// All feature extraction and query generation scenarios share a single snapshot
// ("http-access-synth") and use log_query_filter to select the relevant subset
// of the 53,580-doc dataset for each scenario.
//
// KEY DATASET CHARACTERISTICS:
//  - body.text is minimal ("GET /ping 200", "ERROR: 504 - TimeoutException")
//  - All meaningful signals are in resource.attributes.* and attributes.*
//  - 4 services: web-frontend (node/containerd/k8s), api-gateway (no k8s),
//    mobile-api (java k8s container), cdn (nginx/docker/k8s)
//  - Cloud: GCP (deterministic from date seed; provider-agnostic criteria used)
//  - Attack traffic: 4 attack types via attributes.rule.name
//  - DatabaseException in attributes.error.type is an HTTP error class, NOT a DB signal
// ---------------------------------------------------------------------------

export const httpAccessLogsDataset: DatasetConfig = {
  id: HTTP_ACCESS_SYNTH_NAMESPACE,
  description:
    'Synthtrace HTTP access logs in OpenTelemetry format. 4 services (web-frontend, api-gateway, ' +
    'mobile-api, cdn) with structured OTEL attributes, attack traffic (XSS, SQLi, directory ' +
    'traversal, command injection), bot/crawler traffic, and Kubernetes health check probes. ' +
    'Tests LLM ability to extract features from structured resource.attributes.* fields rather ' +
    'than unstructured message bodies, and to generate ES|QL queries with correct OTEL field paths.',
  gcs: { bucket: GCS_BUCKET, basePathPrefix: HTTP_ACCESS_SYNTH_GCS_BASE_PATH_PREFIX },

  // -------------------------------------------------------------------------
  // Feature Extraction Scenarios
  // -------------------------------------------------------------------------
  // All scenarios share the http-access-synth snapshot.
  // log_query_filter selects the relevant traffic slice for each scenario.
  // The collectSampleDocuments helper uses index 'logs*' after snapshot replay.
  // -------------------------------------------------------------------------
  featureExtraction: [
    // -----------------------------------------------------------------------
    // 3.1 Normal Production Traffic
    // -----------------------------------------------------------------------
    {
      input: {
        scenario_id: 'normal-traffic',
        log_query_filter: {
          bool: {
            must: [{ terms: { 'attributes.http.status_code': [200, 201, 204, 301, 302] } }],
            must_not: [
              { exists: { field: 'attributes.rule.name' } },
              { term: { severity_text: 'ERROR' } },
              { term: { 'attributes.tags': 'attack' } },
              { term: { 'attributes.tags': 'bot' } },
              // Exclude k8s health-check probes (GET /ping 200) — extremely high-frequency,
              // they dominate a timestamp-sorted sample and drown out the business-traffic
              // docs needed to exercise multi-service feature extraction (container images,
              // runtimes, tech stacks). Health checks have no k8s/container/tech signals.
              { term: { 'attributes.tags': 'health-check' } },
            ],
          },
        },
      },
      output: {
        criteria: [
          {
            id: 'entity-web-frontend',
            text: 'Must identify web-frontend as a feature with type "entity" and subtype "service"',
            score: 2,
          },
          {
            id: 'entity-api-gateway',
            text: 'Must identify api-gateway as a feature with type "entity" and subtype "service" or "api_gateway"',
            score: 2,
          },
          {
            id: 'entity-mobile-api',
            text: 'Must identify mobile-api as a feature with type "entity" and subtype "service"',
            score: 2,
          },
          {
            id: 'entity-cdn',
            text: 'Must identify cdn as a feature with type "entity" and subtype "service" or "cdn"',
            score: 2,
          },
          {
            id: 'infra-cloud',
            text: 'Must identify the cloud provider (AWS, GCP, or Azure — whichever appears in resource.attributes.cloud.provider) as an infrastructure feature with subtype "cloud_deployment". Evidence must come from resource.attributes.cloud.provider, not from user agents or hostnames.',
            score: 2,
          },
          {
            id: 'infra-k8s',
            text: 'Must identify Kubernetes as an infrastructure feature with subtype "container_orchestration". Evidence must come from resource.attributes.k8s.* fields. Note: only 60% of docs have k8s metadata — api-gateway has none.',
            score: 2,
          },
          {
            id: 'tech-nginx',
            text: 'Must identify Nginx as a technology feature, inferred from resource.attributes.container.image.name=nginx (cdn) or resource.attributes.k8s.container.name=nginx',
            score: 1,
          },
          {
            id: 'tech-nodejs',
            text: 'Must identify Node.js as a technology feature, inferred from resource.attributes.container.image.name=node (web-frontend)',
            score: 1,
          },
          {
            id: 'tech-java',
            text: 'Must identify Java as a technology feature for mobile-api, inferred from resource.attributes.k8s.container.name=java. This is legitimate — mobile-api runs Java in a k8s container.',
            score: 1,
          },
          {
            id: 'tech-containerd',
            text: 'Must identify containerd as a technology feature with subtype "container_runtime". Evidence: resource.attributes.container.runtime=containerd on web-frontend docs.',
            score: 1,
          },
          {
            id: 'tech-docker',
            text: 'Must identify Docker as a technology feature with subtype "container_runtime". Evidence: resource.attributes.container.runtime=docker on cdn docs.',
            score: 1,
          },
          {
            id: 'schema-otel',
            text: 'Must identify the OpenTelemetry schema from attribute naming conventions (resource.attributes.*, attributes.*, body.text, severity_text)',
            score: 1,
          },
          {
            id: 'no-database',
            text: 'Must NOT identify any database entity or infrastructure. DatabaseException in attributes.error.type is an HTTP response error class name — it does NOT indicate a database exists in this environment.',
            score: 2,
          },
          {
            id: 'no-false-dependencies',
            text: 'Must NOT hallucinate dependency features from HTTP error type names. DatabaseException does NOT mean a database exists; BadGatewayException does NOT mean an upstream service exists. These are HTTP response error class names, not connection evidence.',
            score: 3,
          },
          {
            id: 'no-wrong-cloud',
            text: 'Must NOT identify cloud providers not present in resource.attributes.cloud.provider. Only one provider per run — do not hallucinate additional providers.',
            score: 2,
          },
        ],
        min_features: 9,
        max_features: 20,
        required_types: ['entity', 'technology', 'infrastructure'],
        expected_ground_truth:
          'entities=[web-frontend, api-gateway, mobile-api, cdn], ' +
          'infra=[cloud (GCP/AWS/Azure from resource.attributes.cloud.provider), kubernetes (production namespace)], ' +
          'tech=[node.js (web-frontend container image), nginx (cdn container image), java (mobile-api k8s container), containerd (web-frontend runtime), docker (cdn runtime)], ' +
          'schema=[otel], ' +
          'no-db=true, no-false-deps=true',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'none',
        failure_mode: 'structured_attributes_extraction',
      },
      snapshot_source: { snapshot_name: HTTP_ACCESS_SYNTH_SNAPSHOT_NAME },
    },

    // -----------------------------------------------------------------------
    // 3.2 Attack Traffic
    // -----------------------------------------------------------------------
    {
      input: {
        scenario_id: 'attack-traffic',
        log_query_filter: {
          term: { 'attributes.tags': 'attack' },
        },
      },
      output: {
        criteria: [
          {
            id: 'attack-xss',
            text: 'Must identify XSS attacks as a feature or pattern. Evidence: attributes.rule.name=xss_detected, or attributes.tags containing "xss", or attributes.http.target containing script injection patterns',
            score: 2,
          },
          {
            id: 'attack-sqli',
            text: 'Must identify SQL injection attacks. Evidence: attributes.rule.name=sql_injection_detected, or attributes.http.target containing SQL injection patterns',
            score: 2,
          },
          {
            id: 'attack-traversal',
            text: 'Must identify directory traversal attacks. Evidence: attributes.rule.name=directory_traversal_detected, or attributes.http.target containing path traversal sequences like ../../../../etc/passwd',
            score: 2,
          },
          {
            id: 'attack-cmdi',
            text: 'Must identify command injection attacks. Evidence: attributes.rule.name=command_injection_detected',
            score: 2,
          },
          {
            id: 'attack-tooling',
            text: 'Must identify known attack tooling (sqlmap, Nikto, ZmEu) from attributes.http.user_agent values',
            score: 1,
          },
          {
            id: 'no-false-positive-services',
            text: 'Must NOT create entity features for "phpMyAdmin", "WordPress", "wp-admin", or "phpinfo" — these appear in attributes.http.target as attack probe URLs scanning for vulnerabilities, not as actual running services.',
            score: 3,
          },
        ],
        min_features: 3,
        required_types: ['entity'],
        expected_ground_truth:
          'attack_types=[xss_detected, sql_injection_detected, directory_traversal_detected, command_injection_detected via attributes.rule.name], ' +
          'attack_tools=[sqlmap/1.0, Nikto/2.1.6, ZmEu via attributes.http.user_agent], ' +
          'no-false-service-entities=true (probe URLs are scan targets not running services)',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'security',
        failure_mode: 'multi_vector_attack',
      },
      snapshot_source: { snapshot_name: HTTP_ACCESS_SYNTH_SNAPSHOT_NAME },
    },

    // -----------------------------------------------------------------------
    // 3.3 Bot and Crawler Traffic
    // -----------------------------------------------------------------------
    {
      input: {
        scenario_id: 'bot-crawler-traffic',
        log_query_filter: {
          term: { 'attributes.tags': 'bot' },
        },
      },
      output: {
        criteria: [
          {
            id: 'bot-googlebot',
            text: 'Must identify Googlebot as a feature (bot/crawler type) from attributes.http.user_agent containing "Googlebot"',
            score: 1,
          },
          {
            id: 'bot-bingbot',
            text: 'Must identify Bingbot as a feature from attributes.http.user_agent containing "bingbot"',
            score: 1,
          },
          {
            id: 'bot-gptbot',
            text: 'Must identify GPTBot as a feature from attributes.http.user_agent containing "GPTBot"',
            score: 1,
          },
          {
            id: 'bot-vs-attack',
            text: 'Must distinguish legitimate web crawlers (Googlebot, Bingbot, GPTBot, facebookexternalhit) from attack tools (sqlmap, Nikto, ZmEu, python-requests). They must NOT be grouped into the same feature category.',
            score: 2,
          },
          {
            id: 'no-google-infra',
            text: 'Must NOT identify Google as a cloud provider or infrastructure from the Googlebot user agent. Cloud provider evidence must come from resource.attributes.cloud.provider, not from user agent strings.',
            score: 2,
          },
        ],
        min_features: 2,
        max_features: 10,
        expected_ground_truth:
          'bots=[Googlebot, Bingbot, GPTBot, facebookexternalhit (tags: bot,crawler,legitimate)], ' +
          'attack_tools=[sqlmap, python-requests (tags: bot,attack)], ' +
          'cloud_provider_from=resource.attributes.cloud.provider only',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'none',
        failure_mode: 'bot_vs_attack_disambiguation',
      },
      snapshot_source: { snapshot_name: HTTP_ACCESS_SYNTH_SNAPSHOT_NAME },
    },

    // -----------------------------------------------------------------------
    // 3.4 Structured OTEL with No Message-Body Signals
    // -----------------------------------------------------------------------
    {
      input: {
        scenario_id: 'structured-otel-no-body-signals',
        log_query_filter: {
          bool: {
            must: [{ terms: { 'attributes.http.status_code': [200, 201, 204, 301, 302] } }],
            must_not: [
              { exists: { field: 'attributes.rule.name' } },
              { term: { severity_text: 'ERROR' } },
              { term: { 'attributes.tags': 'attack' } },
              { term: { 'attributes.tags': 'bot' } },
              { term: { 'attributes.tags': 'health-check' } },
            ],
          },
        },
      },
      output: {
        criteria: [
          {
            id: 'structured-service-extraction',
            text: 'Must extract service entity features (web-frontend, api-gateway, mobile-api, cdn) from resource.attributes.service.name — NOT from body.text like "GET /ping 200"',
            score: 2,
          },
          {
            id: 'structured-cloud-extraction',
            text: 'Must extract cloud provider infrastructure feature from resource.attributes.cloud.provider — NOT from body.text or host names',
            score: 2,
          },
          {
            id: 'structured-k8s-extraction',
            text: 'Must extract Kubernetes infrastructure feature from resource.attributes.k8s.* fields — k8s metadata is only in resource attributes, not in body.text',
            score: 2,
          },
          {
            id: 'no-message-hallucination',
            text: 'Must NOT invent technologies or services from minimal body.text like "GET /health 200" or "POST /api/orders 201". These are log summary strings, not technology signals.',
            score: 2,
          },
        ],
        min_features: 3,
        required_types: ['entity', 'infrastructure'],
        expected_ground_truth:
          'entities=[web-frontend, api-gateway, mobile-api, cdn] from resource.attributes.service.name, ' +
          'infra=[cloud, kubernetes] from resource.attributes.cloud.* and k8s.* fields, ' +
          'body.text_ignored=true (body.text is just "GET /path STATUS_CODE" summaries)',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'none',
        failure_mode: 'structured_field_extraction_vs_body_parsing',
      },
      snapshot_source: { snapshot_name: HTTP_ACCESS_SYNTH_SNAPSHOT_NAME },
    },
  ],

  // -------------------------------------------------------------------------
  // Query Generation Scenarios
  // -------------------------------------------------------------------------
  // All scenarios use the http-access-synth snapshot, replayed into the managed
  // 'logs' stream. Queries are executed as ES|QL against 'logs*'.
  //
  // CRITICAL: All ES|QL queries must use attributes.* prefix for OTEL attributes
  // (e.g., attributes.http.status_code, NOT http.status_code).
  // Format: FROM logs* | WHERE <condition>
  // -------------------------------------------------------------------------
  queryGeneration: [
    // -----------------------------------------------------------------------
    // 4.1 Security — Attack Detection
    // -----------------------------------------------------------------------
    {
      input: {
        scenario_id: 'attack-detection',
        stream_name: 'logs',
        stream_description:
          'OTEL HTTP access logs with active security attack traffic: XSS, SQL injection, ' +
          'directory traversal, and command injection. Attack metadata in attributes.rule.name ' +
          '(xss_detected, sql_injection_detected, directory_traversal_detected, command_injection_detected). ' +
          'Attack user agents: sqlmap/1.0, Nikto/2.1.6, ZmEu. ' +
          'All attack docs: attributes.event.category=intrusion_detection, attributes.event.type=denied.',
      },
      output: {
        criteria: [
          {
            id: 'query-xss-detection',
            text: 'Must generate an ES|QL query detecting XSS attacks via attributes.rule.name == "xss_detected" or body.text LIKE/MATCH patterns for script injection',
            score: 2,
          },
          {
            id: 'query-sqli-detection',
            text: 'Must generate an ES|QL query detecting SQL injection via attributes.rule.name == "sql_injection_detected"',
            score: 2,
          },
          {
            id: 'query-traversal-detection',
            text: 'Must generate an ES|QL query detecting directory traversal via attributes.rule.name == "directory_traversal_detected" or attributes.http.target LIKE patterns',
            score: 2,
          },
          {
            id: 'query-attack-tools',
            text: 'Must generate an ES|QL query detecting attack tool user agents (sqlmap, Nikto, ZmEu) using attributes.http.user_agent with == or LIKE',
            score: 1,
          },
          {
            id: 'query-category-security',
            text: 'At least one generated query must have category "security"',
            score: 1,
          },
          {
            id: 'query-valid-esql-field-paths',
            text: 'All queries must use OTEL attributes.* prefix for attack fields — NOT bare field names like rule.name (must be attributes.rule.name). No KQL syntax (field:value), no SQL wildcards (%).',
            score: 2,
          },
        ],
        expected_categories: ['security'],
        esql_substrings: ['rule.name', 'xss_detected'],
        expected_ground_truth:
          'queries=[security detection for xss_detected/sql_injection_detected/directory_traversal_detected/command_injection_detected via attributes.rule.name, attack tool detection via attributes.http.user_agent]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'security',
        failure_mode: 'multi_vector_attack',
      },
      snapshot_source: { snapshot_name: HTTP_ACCESS_SYNTH_SNAPSHOT_NAME },
    },

    // -----------------------------------------------------------------------
    // 4.2 Error — Server Errors
    // -----------------------------------------------------------------------
    {
      input: {
        scenario_id: 'server-errors',
        stream_name: 'logs',
        stream_description:
          'OTEL HTTP access logs with server error events (severity_text=ERROR). ' +
          '5xx HTTP status codes in attributes.http.status_code. ' +
          'Error types in attributes.error.type: TimeoutException, DatabaseException, ' +
          'InternalServerError, BadGatewayException, ServiceUnavailableException. ' +
          'body.text format: "ERROR: 504 - TimeoutException". ' +
          'NOTE: DatabaseException is an HTTP response error class name, NOT evidence of a real database.',
      },
      output: {
        criteria: [
          {
            id: 'query-5xx-errors',
            text: 'Must generate an ES|QL query detecting 5xx HTTP status codes: WHERE attributes.http.status_code >= 500 AND attributes.http.status_code < 600',
            score: 2,
          },
          {
            id: 'query-error-types',
            text: 'Must generate an ES|QL query detecting specific error types via attributes.error.type == "TimeoutException" or similar',
            score: 2,
          },
          {
            id: 'query-severity-errors',
            text: 'Should generate an ES|QL query using severity_text == "ERROR"',
            score: 1,
          },
          {
            id: 'query-category-error',
            text: 'At least one generated query must have category "error"',
            score: 1,
          },
          {
            id: 'query-correct-operators',
            text: 'Numeric fields (attributes.http.status_code) must use ==, >=, < operators — NOT : or LIKE. String fields use ==. No KQL syntax.',
            score: 2,
          },
        ],
        expected_categories: ['error'],
        esql_substrings: ['attributes.http.status_code', '500'],
        expected_ground_truth:
          'queries=[error detection for 5xx status codes via attributes.http.status_code >= 500, typed error classes via attributes.error.type, severity_text=ERROR]',
      },
      metadata: {
        difficulty: 'easy',
        failure_domain: 'backend',
        failure_mode: 'server_errors_5xx',
      },
      snapshot_source: { snapshot_name: HTTP_ACCESS_SYNTH_SNAPSHOT_NAME },
    },

    // -----------------------------------------------------------------------
    // 4.3 Operational — Health Check Anomalies
    // -----------------------------------------------------------------------
    {
      input: {
        scenario_id: 'health-check-anomalies',
        stream_name: 'logs',
        stream_description:
          'OTEL HTTP access logs from Kubernetes health check probes. ' +
          'attributes.http.user_agent=kube-probe/1.28 (liveness/readiness probes). ' +
          'Health endpoints in attributes.http.target: /health, /ready, /alive, /status, /ping, /healthz. ' +
          'attributes.tags=["health-check","monitoring"]. ' +
          'Non-200 responses indicate service degradation or pod startup failures.',
      },
      output: {
        criteria: [
          {
            id: 'query-health-check-failures',
            text: 'Must generate an ES|QL query detecting health check failures: kube-probe requests returning non-200 status codes. Example: WHERE attributes.http.user_agent == "kube-probe/1.28" AND attributes.http.status_code != 200',
            score: 2,
          },
          {
            id: 'query-health-endpoints',
            text: 'Must generate an ES|QL query targeting health check paths in attributes.http.target (LIKE "/health*" or similar)',
            score: 2,
          },
          {
            id: 'query-category-operational',
            text: 'At least one generated query must have category "operational" or "resource_health"',
            score: 1,
          },
        ],
        expected_categories: ['operational', 'resource_health'],
        esql_substrings: ['health', 'attributes.http.status_code'],
        expected_ground_truth:
          'queries=[operational detection for kube-probe health check failures (non-200 on /health /ready /alive /status /ping /healthz endpoints)]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'kubernetes',
        failure_mode: 'health_probe_failures',
      },
      snapshot_source: { snapshot_name: HTTP_ACCESS_SYNTH_SNAPSHOT_NAME },
    },

    // -----------------------------------------------------------------------
    // 4.4 Rate Limiting
    // -----------------------------------------------------------------------
    {
      input: {
        scenario_id: 'rate-limiting',
        stream_name: 'logs',
        stream_description:
          'OTEL HTTP access logs with rate limiting signals. ' +
          'HTTP 429 Too Many Requests in attributes.http.status_code (680 docs). ' +
          'RateLimitException in attributes.error.type (~2,140 docs across various response codes). ' +
          'Indicates clients being throttled by the API gateway or individual services.',
      },
      output: {
        criteria: [
          {
            id: 'query-rate-limiting',
            text: 'Must generate an ES|QL query detecting rate-limited requests via attributes.http.status_code == 429 or attributes.error.type == "RateLimitException"',
            score: 2,
          },
          {
            id: 'query-category-operational',
            text: 'The rate-limiting query must have category "operational" or "resource_health"',
            score: 1,
          },
        ],
        expected_categories: ['operational'],
        esql_substrings: ['429'],
        expected_ground_truth:
          'queries=[operational detection for HTTP 429 rate limiting via attributes.http.status_code == 429 or attributes.error.type == "RateLimitException"]',
      },
      metadata: {
        difficulty: 'easy',
        failure_domain: 'api_gateway',
        failure_mode: 'rate_limit_exceeded',
      },
      snapshot_source: { snapshot_name: HTTP_ACCESS_SYNTH_SNAPSHOT_NAME },
    },

    // -----------------------------------------------------------------------
    // 4.5 Authentication Failures
    // -----------------------------------------------------------------------
    {
      input: {
        scenario_id: 'auth-failures',
        stream_name: 'logs',
        stream_description:
          'OTEL HTTP access logs with OAuth authentication events. ' +
          'attributes.event.category=authentication (900 docs). ' +
          'OAuth flows in attributes.event.action: oauth_authorization_code, oauth_implicit, oauth_client_credentials. ' +
          '401 Unauthorized responses (280 docs) and AuthenticationException in attributes.error.type. ' +
          'Status code mix: 401 (280), 400 (260), 200 (180), 201 (180).',
      },
      output: {
        criteria: [
          {
            id: 'query-auth-failures',
            text: 'Must generate an ES|QL query detecting authentication failures via attributes.http.status_code == 401 or attributes.error.type == "AuthenticationException"',
            score: 2,
          },
          {
            id: 'query-oauth-failures',
            text: 'Should generate an ES|QL query targeting OAuth-specific failures using attributes.event.action (values: oauth_authorization_code, oauth_implicit, oauth_client_credentials) or attributes.event.category == "authentication"',
            score: 1,
          },
          {
            id: 'query-category-security-or-error',
            text: 'Auth failure queries must have category "security" or "error"',
            score: 1,
          },
        ],
        expected_categories: ['security', 'error'],
        esql_substrings: ['401', 'authentication'],
        expected_ground_truth:
          'queries=[security/error detection for 401 Unauthorized via attributes.http.status_code == 401, AuthenticationException via attributes.error.type, OAuth event actions via attributes.event.action]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'authentication',
        failure_mode: 'oauth_auth_failures',
      },
      snapshot_source: { snapshot_name: HTTP_ACCESS_SYNTH_SNAPSHOT_NAME },
    },

    // -----------------------------------------------------------------------
    // 4.6 Mixed Traffic — Comprehensive
    // -----------------------------------------------------------------------
    {
      input: {
        scenario_id: 'mixed-traffic',
        stream_name: 'logs',
        stream_description:
          'OTEL HTTP access logs with comprehensive mixed traffic: attack patterns (XSS, SQLi, ' +
          'directory traversal), bot crawlers (Googlebot, Bingbot, GPTBot), server errors (5xx), ' +
          'OAuth authentication events, and Kubernetes health checks. Full feature context provided. ' +
          'Tests multi-category ES|QL query generation with correct OTEL field path awareness.',
      },
      output: {
        criteria: [
          {
            id: 'query-multi-category',
            text: 'Must generate queries across at least 2 distinct categories (e.g., security + error, or operational + security)',
            score: 2,
          },
          {
            id: 'query-field-awareness',
            text: 'All generated queries must use correct OTEL attributes.* prefix — NOT bare ECS-style fields like http.status_code (must be attributes.http.status_code) or rule.name (must be attributes.rule.name)',
            score: 3,
          },
          {
            id: 'query-execution-hits',
            text: 'At least 80% of generated queries must return results when executed against the dataset via ES|QL',
            score: 2,
          },
          {
            id: 'query-no-ecs-fields',
            text: 'Must NOT generate queries using ECS-style field names (http.response.status_code, http.request.method) — OTEL uses attributes.http.status_code and attributes.http.method',
            score: 2,
          },
          {
            id: 'query-from-clause',
            text: 'All generated queries must start with FROM <stream_name> followed by | WHERE — must not omit the FROM clause or use bare WHERE',
            score: 1,
          },
          {
            id: 'query-esql-string-rules',
            text: 'String literals in ES|QL must use double quotes (not single quotes). No KQL syntax (field:value without quotes), no SQL syntax (SELECT, % wildcards), no lowercase boolean operators (and/or/not).',
            score: 2,
          },
        ],
        expected_categories: ['security', 'error', 'operational'],
        expected_ground_truth:
          'queries=[multi-category ES|QL: security for attack detection, error for 5xx/severity_text=ERROR, operational for health checks/rate limiting], ' +
          'all_field_paths_use_attributes_prefix=true, from_clause_present=true',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'system-wide',
        failure_mode: 'mixed_traffic_multi_category',
      },
      snapshot_source: { snapshot_name: HTTP_ACCESS_SYNTH_SNAPSHOT_NAME },
    },
  ],
};
