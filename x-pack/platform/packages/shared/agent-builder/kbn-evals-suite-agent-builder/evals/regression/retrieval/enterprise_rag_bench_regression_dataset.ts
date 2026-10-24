/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Regression dataset for RAG/text retrieval over the EnterpriseRAG-Bench corpus
 * (9 `enterprise_rag_bench_*_documents_semantic` indices — the fictional Redwood
 * Inference workspace; Jina v5 embeddings). 20 examples tiered
 * simple/medium/hard/ambiguous, curated from the EnterpriseRAG-Bench question pool.
 * Questions are prefixed "At Redwood Inference," so the agent's index discovery cannot
 * confuse this corpus with another domain when every corpus is loaded.
 *
 * Source of truth for curation decisions (row provenance, retrieval sanity checks,
 * reviewer notes): `configs/evaluation/datasets/golden/enterprise_rag_bench_golden_picks.yaml`
 * in the internal `orca` repo. Reviewer notes are intentionally NOT included in example
 * metadata: metadata is passed to LLM judges and the notes contain grading hints.
 *
 * `groundTruth` maps each expected document to the index it lives in (resolved and
 * verified against the restored corpus snapshot, 2026-10-20). `ambiguous`-tier
 * (info_not_found) examples intentionally have an empty groundTruth: the answer is not
 * in the corpus and the agent must say so — IR evaluators return null for them.
 *
 * `metadata.criteria` entries are example-specific grading criteria carried over from
 * curation; no evaluator consumes them yet (future kbn-evals `criteria` evaluator).
 */

import type { Example, GroundTruth } from '@kbn/evals';

export interface EnterpriseRagBenchRegressionExample extends Example {
  input: { question: string };
  output: {
    expected: string;
    /** Expected documents: `{ index: { docId: 1 } }`; empty for info_not_found examples. */
    groundTruth: GroundTruth;
  };
  metadata: {
    queryId: string;
    /** 0-based data row in the source CSV. */
    sourceRow: number;
    tier: 'simple' | 'medium' | 'hard' | 'ambiguous';
    questionType: string;
    sourceTypes: string[];
    criteria?: string[];
  };
}

export const ENTERPRISE_RAG_BENCH_REGRESSION_DATASET: {
  name: string;
  description: string;
  examples: EnterpriseRagBenchRegressionExample[];
} = {
  name: 'agent builder: regression-retrieval-enterprise-rag-bench',
  description:
    'Fixed regression dataset for RAG/text retrieval over the EnterpriseRAG-Bench corpus. 20 curated examples tiered by difficulty, including info_not_found behaviour checks.',
  examples: [
    // qst_0159 | simple | basic
    {
      input: {
        question:
          'At Redwood Inference, what were the two immediate options the SRE suggested when a finance customer could not reserve four A100 GPUs in eu-west-1 due to insufficient capacity?',
      },
      output: {
        expected:
          'The SRE suggested two immediate options: (1) move the reservation to eu-central-1, or (2) use Dedicated plus burst capacity (temporary shared nodes) while the team tried to free up reserved units in eu-west-1.',
        groundTruth: {
          enterprise_rag_bench_slack_documents_semantic: {
            dsid_3ab4d00190a1485da19d929f9f71bb5a: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0159',
        sourceRow: 158,
        tier: 'simple',
        questionType: 'basic',
        sourceTypes: ['slack'],
        criteria: [
          'The SRE suggested moving the reservation to eu-central-1.',
          'The SRE suggested using Dedicated plus burst capacity (temporary shared nodes) while the team tried to free up reserved units in eu-west-1.',
        ],
      },
    },
    // qst_0105 | simple | basic
    {
      input: {
        question:
          'At Redwood Inference, what are the proposed internal time to mitigate targets by severity for incident response, regardless of customer deployment tier?',
      },
      output: {
        expected:
          'The proposed internal time-to-mitigate (TTM) targets (same for all tiers) are: Sev0 = 30 minutes, Sev1 = 2 hours, Sev2 = 1 business day, and Sev3 = 5 business days (or the next planned release train).',
        groundTruth: {
          enterprise_rag_bench_google_drive_documents_semantic: {
            dsid_c83811391709468fa9534e6495c205e3: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0105',
        sourceRow: 104,
        tier: 'simple',
        questionType: 'basic',
        sourceTypes: ['google_drive'],
        criteria: [
          'The proposed internal time-to-mitigate targets are the same for all customer deployment tiers.',
          'The proposed time-to-mitigate target for Sev0 is 30 minutes.',
          'The proposed time-to-mitigate target for Sev1 is 2 hours.',
        ],
      },
    },
    // qst_0176 | medium | semantic
    {
      input: {
        question:
          'At Redwood Inference, when does booking open for the new top end 80GB accelerator on dedicated clusters in the EU Central and India South locations?',
      },
      output: {
        expected:
          'Reservations for the new NVIDIA H200 80GB (h200-80) dedicated capacity in eu-central-1 and ap-south-1 open on Monday, 2026-04-06 at 09:00 UTC.',
        groundTruth: {
          enterprise_rag_bench_slack_documents_semantic: {
            dsid_45e2a8ccc16c4c048894f98c6cd8833c: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0176',
        sourceRow: 175,
        tier: 'medium',
        questionType: 'semantic',
        sourceTypes: ['slack'],
        criteria: [
          'Booking for the new NVIDIA H200 80GB (h200-80) dedicated capacity opens on Monday, 2026-04-06 at 09:00 UTC.',
          'Booking opens for dedicated clusters in the EU Central (eu-central-1) location.',
          'Booking opens for dedicated clusters in the India South (ap-south-1) location.',
        ],
      },
    },
    // qst_0223 | medium | semantic
    {
      input: {
        question:
          'At Redwood Inference, why did our telemetry collectors in the dedicated production clusters stop being able to mint short lived credentials for a customer cloud identity when going through the AWS to GCP federation bridge, after an IAM policy tightening with conditional rules, causing missing metrics and traces for about a day in US East and EU West?',
      },
      output: {
        expected:
          "The observability agents failed because a recent org/project IAM tightening added conditional rules on the serviceAccountTokenCreator (impersonation) binding that only allow `iam.serviceAccounts.getAccessToken` when `resource.name` matches an exact pattern and certain federated attributes (e.g., `broker_id`) are present. When the agents went through the AWS STS→GCP federation broker, the broker-issued federated tokens caused a different `resource.name`/audience evaluation and lacked the expected attributes, so the condition didn't match and GCP denied impersonation-leading to missing metrics and traces in us-east and eu-west for ~36 hours.",
        groundTruth: {
          enterprise_rag_bench_jira_documents_semantic: {
            dsid_62ff534dc35a425896b265216f94f69a: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0223',
        sourceRow: 222,
        tier: 'medium',
        questionType: 'semantic',
        sourceTypes: ['jira'],
        criteria: [
          'A recent organization or project IAM tightening added conditional rules to the serviceAccountTokenCreator (impersonation) binding.',
          'The conditional rules only allow iam.serviceAccounts.getAccessToken when resource.name matches an exact pattern and certain federated attributes such as broker_id are present.',
          'When collectors used the AWS STS to GCP federation broker, the broker-issued federated tokens evaluated with a different resource.name or audience and lacked the expected federated attributes.',
        ],
      },
    },
    // qst_0280 | medium | semantic
    {
      input: {
        question:
          'At Redwood Inference, in the rollout plan for the internal service that only hands out application secrets to verified runtime hosts using short lived machine health proofs and hardware backed key unwrapping, what is the default hot and cold retention period for the tamper resistant audit trail?',
      },
      output: {
        expected:
          'The tamper-evident audit trail defaults to 90 days of hot retention and 1 year of cold retention.',
        groundTruth: {
          enterprise_rag_bench_google_drive_documents_semantic: {
            dsid_6713194be8d54a0f8de8f8d89347ecf6: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0280',
        sourceRow: 279,
        tier: 'medium',
        questionType: 'semantic',
        sourceTypes: ['google_drive'],
        criteria: [
          'The tamper-evident audit trail has a default hot retention period of 90 days.',
          'The tamper-evident audit trail has a default cold retention period of 1 year.',
        ],
      },
    },
    // qst_0304 | hard | intra_document_reasoning
    {
      input: {
        question:
          'At Redwood Inference, for the PayRight Redwood DPA negotiation, what incident notification timeframe did PayRight request at the start and what notification window did Redwood propose in the final tracked wording before sending the DocuSign link?',
      },
      output: {
        expected:
          "PayRight requested 24-hour incident notification, and Redwood's final proposed tracked wording offered a 48-hour notification window (with immediate notice for high-severity incidents).",
        groundTruth: {
          enterprise_rag_bench_gmail_documents_semantic: {
            dsid_326387eb70834053ab4447fc1596da38: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0304',
        sourceRow: 303,
        tier: 'hard',
        questionType: 'intra_document_reasoning',
        sourceTypes: ['gmail'],
        criteria: [
          'PayRight requested a 24-hour incident notification timeframe at the start of the negotiation.',
          'Redwoods final proposed tracked wording before sending the DocuSign link offered a 48-hour incident notification window.',
          'Redwoods final proposed tracked wording also called for immediate notice for high-severity incidents.',
        ],
      },
    },
    // qst_0337 | hard | intra_document_reasoning
    {
      input: {
        question:
          'At Redwood Inference, in the resilient streaming schema proposal, what resume success rate is targeted in the success metrics and what resume_success_rate threshold would trigger a rollback during rollout?',
      },
      output: {
        expected:
          'The success metrics target a resume success rate of at least 98% for reconnects within 24 hours. During rollout, rollback would be triggered if resume_success_rate drops below 95% for 4 hours.',
        groundTruth: {
          enterprise_rag_bench_linear_documents_semantic: {
            dsid_b4443ecc53154934902652d496c9d12e: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0337',
        sourceRow: 336,
        tier: 'hard',
        questionType: 'intra_document_reasoning',
        sourceTypes: ['linear'],
        criteria: [
          'The success metrics target a resume success rate of at least 98% for reconnects within 24 hours.',
          'A rollback during rollout is triggered if resume_success_rate drops below 95% for 4 hours.',
        ],
      },
    },
    // qst_0393 | hard | constrained
    {
      input: {
        question:
          'At Redwood Inference, after the March 9, 2026 embedding-catalog promotion that made a 1024-d embedding model the default, a dedicated Hosted API tenant (us-west with eu-west failover) saw /v1/rerank start timing out with 512-vs-1024 vector length mismatches when using the alias open-embed-default. What was the confirmed root cause, and what short-term mitigation and permanent fix did we deploy?',
      },
      output: {
        expected:
          "Root cause: the March 9, 2026 catalog promotion/migration failed to persist tenant-specific alias overrides, so for that dedicated tenant the alias open-embed-default unexpectedly resolved to open-embed-1024-v2 (1024-d) instead of the legacy 512-d model, and the reranker's strict dimension check then hit an expensive error/retry path that drove timeouts. Short-term mitigation: apply a per-tenant routing override / explicit pin to open-embed-512-v1 (and restart long-running workers / rerun affected batches). Permanent fix: deploy the catalog alias-persistence hotfix and roll it out to restore correct per-tenant alias resolution (open-embed-default -> open-embed-512-v1) and prevent future alias drift.",
        groundTruth: {
          enterprise_rag_bench_confluence_documents_semantic: {
            dsid_90218d9a9af84072bcf3ff7bb90b5fa1: 1,
          },
          enterprise_rag_bench_jira_documents_semantic: {
            dsid_4b15b253ca294377a12d12651ada2168: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0393',
        sourceRow: 392,
        tier: 'hard',
        questionType: 'constrained',
        sourceTypes: ['confluence', 'jira'],
        criteria: [
          'The March 9, 2026 embedding catalog promotion migration failed to persist tenant-specific alias overrides for a dedicated Hosted API tenant.',
          'Because the tenant-specific override was not persisted, the alias open-embed-default unexpectedly resolved to open-embed-1024-v2 (1024 dimensional) instead of the legacy 512 dimensional model.',
          'The reranker performed a strict embedding dimension check, and the resulting 512 vs 1024 mismatch triggered an expensive error or retry path that caused /v1/rerank timeouts.',
        ],
      },
    },
    // qst_0400 | hard | constrained
    {
      input: {
        question:
          'At Redwood Inference, for a shadow evaluation running in a private deployment using an evaluator sidecar, what fields are required in each shadow probe telemetry record, and which run-lifecycle telemetry events must the evaluator emit?',
      },
      output: {
        expected:
          'Each shadow probe telemetry record must include: probe_id, tenant_id, deployed_model, deployment_variant, quant_profile, hardware_tag, prompt_family, seed_context_hash, latency_ms, tokens_input, tokens_generated, top_level_metrics, error_code, timestamp_utc. The evaluator must emit these run-lifecycle telemetry events: eval.run.start, eval.run.progress, eval.run.complete.',
        groundTruth: {
          enterprise_rag_bench_confluence_documents_semantic: {
            dsid_10a7359bb6ad4b959ad2171abdb9f620: 1,
            dsid_b52a8760cae1451a9504edcf9ff58e31: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0400',
        sourceRow: 399,
        tier: 'hard',
        questionType: 'constrained',
        sourceTypes: ['confluence'],
        criteria: [
          'Each shadow probe telemetry record must include probe_id, tenant_id, deployed_model, deployment_variant, quant_profile, hardware_tag, prompt_family, seed_context_hash, latency_ms, tokens_input, tokens_generated, top_level_metrics, error_code, and timestamp_utc.',
          'The evaluator must emit the eval.run.start run-lifecycle telemetry event.',
          'The evaluator must emit the eval.run.progress run-lifecycle telemetry event.',
        ],
      },
    },
    // qst_0380 | hard | project_related
    {
      input: {
        question:
          'At Redwood Inference, which template telemetry header format are we standardizing on for KPI tracking, and how do the quickstart templates behave by default when a corporate proxy blocks those headers?',
      },
      output: {
        expected:
          "We're standardizing on a single allow-listed header, x-redwood-template-tags, containing semicolon-separated k=v pairs for the rw.template.* fields (name/lang/version/install_id/channel). Quickstart templates make this telemetry opt-in (default: not sent), so behind a corporate proxy that blocks unknown headers the template still works by default; only if a user explicitly enables the header would the proxy potentially return a 4xx, in which case telemetry should be turned back off.",
        groundTruth: {
          enterprise_rag_bench_jira_documents_semantic: {
            dsid_be8d2802cf3245088a7e7f861f317b31: 1,
          },
          enterprise_rag_bench_linear_documents_semantic: {
            dsid_3e7cf5be42d84f2880858c726b65998f: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0380',
        sourceRow: 379,
        tier: 'hard',
        questionType: 'project_related',
        sourceTypes: ['jira', 'linear'],
        criteria: [
          'The standardized template telemetry header is a single allow-listed header named x-redwood-template-tags.',
          'The x-redwood-template-tags header contains semicolon-separated k=v pairs for rw.template.* fields (name, lang, version, install_id, channel).',
          'Quickstart templates make sending this telemetry header opt-in and do not send it by default.',
        ],
      },
    },
    // qst_0350 | hard | project_related
    {
      input: {
        question:
          'At Redwood Inference, why did Northpeak Search see their Dedicated Burst Usage billed higher than expected, and how do we prevent retry attempts from double-counting burst GPU-seconds now?',
      },
      output: {
        expected:
          'Northpeak Search saw Dedicated Burst Usage come in higher than expected because the burst metering path was double-counting retries: when the client (and sometimes the gateway) retried on 429/overload or transient failures, the metering emitter produced a burst increment per attempt, and in some retry paths the request_id was regenerated per attempt while idempotency_key was missing/empty. Since downstream de-dupe was keyed mainly on (tenant_id, request_id), those attempts did not collapse, inflating daily burst GPU-seconds (notably 2025-06-15 to 2025-06-18).\n\nTo prevent this now, burst usage is made idempotent across retries by carrying a stable request-scoped idempotency key end-to-end: the gateway accepts X-Redwood-Idempotency-Key, and if absent generates a ULID once per incoming request and reuses it across internal retry attempts; the metering event includes idempotency_key, and the central burst_usage_aggregator dedupes on (tenant_id, region, hw_class, pool_id, idempotency_key) with a bounded TTL (storing only a hash of the key). We also added export-time reconciliation/guardrails (metrics for dropped duplicates and a batch check that alerts/blocks export if duplicate keys exceed a small threshold) and backfilled the affected dates with a billing adjustment/credit.',
        groundTruth: {
          enterprise_rag_bench_github_documents_semantic: {
            dsid_939eea1a52f84393b0f87492b9aba8c2: 1,
          },
          enterprise_rag_bench_google_drive_documents_semantic: {
            dsid_95c7aa5238f94570a8e0a8684736b666: 1,
          },
          enterprise_rag_bench_jira_documents_semantic: {
            dsid_f3e6edec6f4947a5bd5aa7fd557d7d2b: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0350',
        sourceRow: 349,
        tier: 'hard',
        questionType: 'project_related',
        sourceTypes: ['github', 'google_drive', 'jira'],
        criteria: [
          'Dedicated Burst Usage was higher than expected because the burst metering path was double-counting retry attempts.',
          'When the client or gateway retried requests due to 429 overload responses or transient failures, the metering emitter produced a separate burst increment for each attempt.',
          'In some retry paths the request_id was regenerated per attempt and the idempotency_key was missing or empty, preventing retries from being recognized as the same logical request.',
        ],
      },
    },
    // qst_0433 | hard | completeness
    {
      input: {
        question:
          "At Redwood Inference, what is Redwood Inference's end-to-end process for rotating secrets and credentials used by production services (including emergency rotation)?",
      },
      output: {
        expected:
          'For planned rotation, the owning service team identifies the secret (Vault path) and **all consumers** via the Credential Dependencies inventory, confirms tier/cadence and access, then rotates using a repeatable pattern: preferably **dual-valid overlap** (generate new credential → write as a new Vault version without deleting old → deploy/update consumers to read latest and, if applicable, accept old+new → monitor auth/health for ≥30 minutes (≥60 for Tier 0) → disable/deprecate the old credential at the issuer → remove the old Vault version after the overlap window, default 7 days) or, if overlap isn\'t possible, a **cutover** (scheduled change window → change issuer-side credential → immediately update Vault → restart/redeploy all consumers → validate/rollback if needed). After any rotation, they complete the verification checklist (ensure all rollouts/reloads completed, monitor auth/dependency metrics, run critical canaries, confirm audit logs and that any break-glass access is revoked) and record the event in a change record.\n\nFor **emergency rotation** (suspected compromise/exposure/anomalies), an incident is opened and "emergency secret rotation" is declared (secret names/paths only), break-glass may be used via the approved workflow for **time-limited (60 min)** Tier 0/1 rotate access with full audit logging; the IC/Security/SRE prioritize and rotate **Tier 0 then Tier 1**, selecting dual-valid where possible or cutover otherwise, updating issuer + Vault and restarting/redeploying all consumers, pausing to reassess if impact worsens, recording exact timestamps, then revoking break-glass immediately and documenting rotated secrets/services plus any follow-up rotations (derived/cached tokens) in the incident timeline and post-incident summary for Security review.',
        groundTruth: {
          enterprise_rag_bench_confluence_documents_semantic: {
            dsid_8c92178c254d467c9854db67aac7c9be: 1,
            dsid_a898d2541b944cdebeec03ec9d9ba130: 1,
            dsid_cf06e75be4f94156ac338f62e3ee028b: 1,
            dsid_97b25b6f83c542e7b81d6504b5653dcb: 1,
            dsid_3e991a24c7bc4e91b99eb5846b927558: 1,
            dsid_74ebb73359364bc791707a92a3227e3a: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0433',
        sourceRow: 432,
        tier: 'hard',
        questionType: 'completeness',
        sourceTypes: ['confluence'],
        criteria: [
          'For planned rotation, the owning service team identifies the secret (Vault path) and all consumers via the Credential Dependencies inventory.',
          'For planned rotation, the owning service team confirms tier and cadence and access before rotating.',
          'Preferred planned rotation method is dual-valid overlap: generate a new credential, write it as a new Vault version without deleting the old, deploy/update consumers to read the latest and if applicable accept both old and new, monitor authentication and service health for at least 30 minutes (at least 60 minutes for Tier 0), then disable or deprecate the old credential at the issuer, and remove the old Vault version after the overlap window (default 7 days).',
        ],
      },
    },
    // qst_0448 | hard | completeness
    {
      input: {
        question:
          'At Redwood Inference, which customers have been granted an exception to Redwood’s default inference request log retention policy, and what retention period was approved for each?',
      },
      output: {
        expected:
          'The approved exceptions were: Northstar Bank — payload logging disabled (0 days) and metadata retained for 30 days; Helio Health — payload retained for 7 days and metadata kept at the default 90 days; QuantaGov — payload retained for 180 days and metadata for 365 days.',
        groundTruth: {
          enterprise_rag_bench_gmail_documents_semantic: {
            dsid_84ec014ad9f14f1481b45484da41181a: 1,
            dsid_5f0ab47fe8de47a89bb6668f8722becf: 1,
          },
          enterprise_rag_bench_google_drive_documents_semantic: {
            dsid_67a8c3300752435296938175e9a1daf5: 1,
          },
          enterprise_rag_bench_jira_documents_semantic: {
            dsid_e91e68b31a6f4935b87d6f74dd07e1f6: 1,
            dsid_b793b06789ae4147884e94681c6beae1: 1,
            dsid_6933f9241ef140da9d3bf98be52be867: 1,
          },
          enterprise_rag_bench_slack_documents_semantic: {
            dsid_b72bd7e0c91a4f8c9d9a13daf6ff3d28: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0448',
        sourceRow: 447,
        tier: 'hard',
        questionType: 'completeness',
        sourceTypes: ['gmail', 'google_drive', 'jira', 'slack'],
        criteria: [
          'Northstar Bank was granted an exception with payload logging disabled, equivalent to 0 days of payload retention, and metadata retained for 30 days.',
          'Helio Health was granted an exception with payload retained for 7 days and metadata retained for the default 90 days.',
          'QuantaGov was granted an exception with payload retained for 180 days and metadata retained for 365 days.',
        ],
      },
    },
    // qst_0430 | hard | conflicting_info
    {
      input: {
        question:
          'At Redwood Inference, does the Hosted AWS Marketplace SKU support customer-managed KMS keys (BYOK)?',
      },
      output: {
        expected:
          "Updated (2026 FAQ): Hosted uses provider-managed KMS keys by default, but customer-managed KMS (BYOK) is available for enterprise tenants in select regions as an add-on (subject to feasibility); if it's not available in the target region, Hosted remains provider-managed. Dedicated supports customer-managed keys in many configurations, and Private/VPC supports customer-managed keys and is typically recommended when BYOK is a hard requirement. (Note: an earlier Northpeak call indicated Hosted could not do BYOK and suggested Private as the path.)",
        groundTruth: {
          enterprise_rag_bench_confluence_documents_semantic: {
            dsid_8f0b7a8c1dbb4df0b23f6c4e61c9f1a6: 1,
          },
          enterprise_rag_bench_fireflies_documents_semantic: {
            dsid_3c9fe2220c204f13b878bd7d3a168f91: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0430',
        sourceRow: 429,
        tier: 'hard',
        questionType: 'conflicting_info',
        sourceTypes: ['confluence', 'fireflies'],
        criteria: [
          'States that Hosted uses provider-managed keys by default, and that customer-managed KMS is an add-on for enterprise tenants in select regions, not available everywhere.',
          'Treats the older note that Hosted cannot do BYOK as superseded by the 2026 FAQ, not as the current answer.',
          'Says Private (VPC) supports customer-managed keys and is the usual recommendation when BYOK is a hard requirement.',
        ],
      },
    },
    // qst_0414 | hard | conflicting_info
    {
      input: {
        question:
          'At Redwood Inference, INC-9821: was the degraded GPU node an OOM or intermittent driver/kernel launch stalls?',
      },
      output: {
        expected:
          'After deeper node telemetry review (2026-09-01), Redwood concluded the degraded GPU instance was primarily experiencing intermittent driver/kernel launch stalls (not a sustained GPU OOM). Earlier triage/postmortem language had speculated about an OOM or generic kernel failure/degraded kernel behavior, but this was later corrected.',
        groundTruth: {
          enterprise_rag_bench_gmail_documents_semantic: {
            dsid_5611f05242ae4e6b9ae68d3c3e91bd54: 1,
          },
          enterprise_rag_bench_jira_documents_semantic: {
            dsid_0c1f1c83e8d44d2fa3a9f6c7b2d7b9f1: 1,
          },
        },
      },
      metadata: {
        queryId: 'qst_0414',
        sourceRow: 413,
        tier: 'hard',
        questionType: 'conflicting_info',
        sourceTypes: ['gmail', 'jira'],
        criteria: [
          'Concludes the degraded GPU node was primarily intermittent driver/kernel launch stalls, not a sustained OOM.',
          'Treats the earlier OOM language as superseded by the 2026-09-01 telemetry review.',
        ],
      },
    },
    // qst_0481 | ambiguous | info_not_found
    {
      input: {
        question:
          'At Redwood Inference, for the hot-route capacity protection rollout in us-east, which specific enterprise accounts were on the initial allowlist, and what were the exact per-route-group budget values (RPS, estimated TPS, and concurrency) configured for each of those accounts?',
      },
      output: {
        expected:
          "The documents don't list which enterprise accounts were on the initial hot-route allowlist, or the budget values configured per account. They describe the allowlist as a rollout gate and give only a conceptual example budget (enterprise chat in us-east: 250 RPS, about 1.2M estimated TPS, 3,000 concurrency) that isn't tied to any named account.",
        groundTruth: {},
      },
      metadata: {
        queryId: 'qst_0481',
        sourceRow: 480,
        tier: 'ambiguous',
        questionType: 'info_not_found',
        sourceTypes: [],
        criteria: [
          'Does not name specific allowlisted accounts.',
          'Does not present the conceptual example budget (250 RPS, 1,200,000 TPS, 3,000 concurrency) as the configured values for named accounts.',
          'States clearly that the account-level allowlist and per-account budgets are not found in the documents.',
        ],
      },
    },
    // qst_0484 | ambiguous | info_not_found
    {
      input: {
        question:
          'At Redwood Inference, what is the complete mapping of `billing_tag` → Finance GL code (and cost center owner) used for chargebacks in the Eval Budget Ledger, and where is that mapping source-of-truth maintained?',
      },
      output: {
        expected:
          "The documents don't contain the billing_tag to Finance GL code and cost-center-owner mapping. The Eval Budget Ledger and Cost Attribution Framework only defines billing_tag as an optional field for downstream finance mapping and says Finance owns the final mapping to GL codes; the mapping itself isn't listed.",
        groundTruth: {},
      },
      metadata: {
        queryId: 'qst_0484',
        sourceRow: 483,
        tier: 'ambiguous',
        questionType: 'info_not_found',
        sourceTypes: [],
        criteria: [
          'Does not invent a billing_tag to GL code or cost-center mapping.',
          'Says Finance owns the final mapping, if it mentions where the mapping lives.',
          'States clearly that the mapping itself is not found in the documents.',
        ],
      },
    },
    // qst_0493 | ambiguous | info_not_found
    {
      input: {
        question:
          'At Redwood Inference, what are the exact Azure Marketplace metering dimension names and units we use for Hosted API (input tokens, output tokens, embeddings, rerank), and what rounding/aggregation policy do we apply when reporting usage to Azure?',
      },
      output: {
        expected:
          "The documents don't specify the Azure Marketplace metering dimension names and units for Hosted API, or an Azure rounding and aggregation policy. A customer email asks for exactly this, and a GCP Marketplace SKU and billing dimensions document exists, but nothing answers for Azure.",
        groundTruth: {},
      },
      metadata: {
        queryId: 'qst_0493',
        sourceRow: 492,
        tier: 'ambiguous',
        questionType: 'info_not_found',
        sourceTypes: [],
        criteria: [
          "Does not present GCP or AWS Marketplace metering dimensions as if they were Azure's.",
          'States clearly that Azure Marketplace metering dimension names, units and rounding policy are not found in the documents.',
        ],
      },
    },
    // qst_0496 | ambiguous | info_not_found
    {
      input: {
        question:
          "At Redwood Inference, does Incident Bot v2 support sending its incident context cards (deploy/config diff/saturation + pinned escalation context) to Microsoft Teams via an incoming webhook/Adaptive Cards, and if so what's the required payload schema and idempotency/retry behavior for updates?",
      },
      output: {
        expected:
          "The documents don't say that Incident Bot v2 can send its incident context cards to Microsoft Teams, and don't give a Teams webhook or Adaptive Card payload schema or idempotency and retry behaviour. The Incident Bot v2 materials describe Slack-based context cards (deploy, config diff, saturation).",
        groundTruth: {},
      },
      metadata: {
        queryId: 'qst_0496',
        sourceRow: 495,
        tier: 'ambiguous',
        questionType: 'info_not_found',
        sourceTypes: [],
        criteria: [
          'Does not claim Microsoft Teams support or invent a webhook payload schema, idempotency or retry behaviour.',
          'States clearly that Teams delivery is not found in the documents.',
        ],
      },
    },
    // qst_0500 | ambiguous | info_not_found
    {
      input: {
        question:
          "At Redwood Inference, when a high-risk production change requires Change Advisory Board (CAB) approval, what quorum is required and what's the tie-break process if the CAB can't reach consensus-and who has final decision authority?",
      },
      output: {
        expected:
          "The documents don't state a Change Advisory Board quorum, a tie-break process or who has final decision authority for high-risk production changes. They discuss change-management approvals and CAB feedback in general, but give no quorum rule.",
        groundTruth: {},
      },
      metadata: {
        queryId: 'qst_0500',
        sourceRow: 499,
        tier: 'ambiguous',
        questionType: 'info_not_found',
        sourceTypes: [],
        criteria: [
          'Does not invent a CAB quorum number, tie-break process or final decision authority.',
          'States clearly that the CAB quorum and tie-break rule are not found in the documents.',
        ],
      },
    },
  ],
};
