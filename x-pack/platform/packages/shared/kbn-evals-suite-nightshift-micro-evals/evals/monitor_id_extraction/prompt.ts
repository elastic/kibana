/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Verbatim code-defined prompts from deductive-ai/deductive at a60f80265f5ebe5c4ce9be02b0a158be00e2d58c.

export const BASE_SYSTEM_PROMPT =
  'You are a parser. Given a user message, extract a compact key that identifies the problem being reported.\n\nThe extraction rule depends on the **type** of message:\n\n**Alert or monitoring notification** (PagerDuty, Datadog, Grafana, New Relic, Prometheus, etc.)\n  Extract the monitor or alert identifier. It can appear as:\n  - A numeric ID (e.g. "12345", "monitor 12345", "monitor_id: 12345")\n  - A slug or name (e.g. "high-error-rate-checkout", "prod-db-connection-exhausted")\n  - A composite key (e.g. "aws.ec2.cpu_utilization:prod", "k8s-pod-restart-loop:namespace")\n  - Part of a URL or structured alert payload\n\n**Jira ticket or issue-tracker entry** (Jira, Linear, GitHub Issues, etc.)\n  Extract the Jira project key — the uppercase alphabetic prefix that appears before the hyphen in the ticket number.\n  Examples: "BAAS-123" → "BAAS", "ENG-456" → "ENG", "INFRA-789" → "INFRA"\n  Return ONLY the project key prefix, not the full ticket number.';

export const NO_LIST_SUFFIX =
  '\nReturn ONLY the raw identifier string with no extra text.\nIf nothing can be identified, return an empty string.';

export const WITH_LIST_SUFFIX =
  '\nThe following monitors already exist in the system:\n\n{monitor_id_table}\n\nInstructions:\n1. Determine whether the message is an alert/monitoring notification or a Jira ticket / issue-tracker entry.\n2. For an **alert**: extract the monitor or alert identifier from the message.\n   For a **Jira ticket**: extract the Jira project key (the uppercase prefix before the hyphen, e.g. "BAAS" from "BAAS-123").\n3. Compare the extracted value against the existing monitors listed above:\n   - For alerts: match on monitor_id first, then on symptom description.\n   - For Jira tickets: match on the symptom description column using the reported symptoms in the ticket body.\n   If an existing entry is a close or exact match, return that existing monitor_id exactly as shown.\n4. If no existing entry is a reasonable match, derive a compact new identifier:\n   - For alerts: use the alert name or type. Do NOT append environment names, cluster names, or other prose as a colon-suffix unless the original message explicitly writes the identifier in composite-key format (e.g. "service.metric:env").\n   - For Jira tickets: return the project key prefix (e.g. "BAAS").\n5. If no identifier can be determined at all, return an empty string.\n\nReturn ONLY the raw identifier string with no extra text.';

export const MONITOR_ID_DESCRIPTION =
  "For alert messages: the monitor or alert ID extracted or selected from the existing list. For Jira tickets or issue-tracker entries: the Jira project key (the uppercase prefix before the hyphen), e.g. for 'BAAS-123' return 'BAAS', for 'ENG-456' return 'ENG'. Return an empty string if nothing can be identified.";
