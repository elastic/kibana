/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeedScenario } from '../types';
import { fromStream } from '../types';

export const CLAIMS_SEED: Record<string, SeedScenario> = {
  healthy_baseline: {
    scenarioName: 'healthy_baseline',
    queries: [
      {
        title: 'Successful claim intake requests',
        description: 'Health check: successful claim-intake paths during baseline traffic.',
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE \`service.name\` == "claim-intake" AND message LIKE "*completed*"
| LIMIT 500`,
      },
    ],
    insights: [
      {
        title: 'Baseline traffic healthy',
        description: 'No failure injections; claim pipeline operating within normal parameters.',
        impact: 'low',
        recommendations: ['Continue periodic review of SLO dashboards.'],
      },
    ],
  },

  postgres_timeout: {
    scenarioName: 'postgres_timeout',
    queries: [
      {
        title: 'Postgres infra timeout signals',
        description: 'Matches slow-query / lock-wait lines emitted when postgres is failing.',
        severityScore: 9,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE message LIKE "*ShareLock*" OR message LIKE "*duration:*ms*statement*"
| LIMIT 500`,
      },
      {
        title: 'App-layer postgres pool exhaustion',
        description: 'Matches application DB pool errors during postgres_timeout.',
        severityScore: 9,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE message LIKE "*pgx*" OR message LIKE "*psycopg2*" OR message LIKE "*HikariPool*"
| LIMIT 500`,
      },
    ],
    insights: [
      {
        title: 'Postgres saturation driving cascading timeouts',
        description:
          'Postgres connection and query latency spikes align with downstream HTTP 503s on claim-intake.',
        impact: 'critical',
        recommendations: [
          'Inspect postgres connection counts and slow query log.',
          'Scale pool sizes or add read replicas before retry storms amplify.',
        ],
      },
    ],
  },

  multi_failure: {
    scenarioName: 'multi_failure',
    queries: [
      {
        title: 'Postgres timeout corpus',
        description: 'Infra + app postgres failure lines.',
        severityScore: 9,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE message LIKE "*postgres*" OR message LIKE "*pgx*" OR message LIKE "*duration:*ms*statement*"
| LIMIT 500`,
      },
      {
        title: 'Fraud-check internal errors',
        description: 'Python/Java/Node internal_error templates on fraud-check.',
        severityScore: 8,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE \`service.name\` == "fraud-check" AND (message LIKE "*Unhandled*" OR message LIKE "*exception*")
| LIMIT 500`,
      },
    ],
    insights: [
      {
        title: 'Correlated DB and fraud-tier failures',
        description:
          'Concurrent postgres timeouts and fraud-check internal errors indicate a multi-blast radius incident.',
        impact: 'high',
        recommendations: [
          'Triage postgres first, then validate fraud model availability.',
          'Consider temporarily shedding load at claim-intake.',
        ],
      },
    ],
  },

  k8s_crashloop: {
    scenarioName: 'k8s_crashloop',
    queries: [
      {
        title: 'Kubelet crash-loop signals',
        description: 'Pod worker back-off lines for policy-lookup crash loop.',
        severityScore: 9,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE message LIKE "*back-off*" OR message LIKE "*CrashLoop*" OR message LIKE "*restart*failed*container*"
| LIMIT 500`,
      },
      {
        title: 'Java policy-lookup liveness failures',
        description: 'Service logs for policy-lookup during crash-loop phase.',
        severityScore: 8,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE \`service.name\` == "policy-lookup" AND (message LIKE "*liveness*" OR message LIKE "*health*timeout*" OR message LIKE "*startup*failed*")
| LIMIT 500`,
      },
    ],
    insights: [
      {
        title: 'policy-lookup unstable — synchronous callers affected',
        description: 'CrashLoopBackOff on policy-lookup drives elevated errors on claim-intake.',
        impact: 'critical',
        recommendations: [
          'Inspect pod events and last termination reason.',
          'Validate readiness vs liveness probe configuration.',
        ],
      },
    ],
  },

  volume_skew: {
    scenarioName: 'volume_skew',
    queries: [
      {
        title: 'High-volume claim-intake slice',
        description: 'Hub service traffic during volume skew.',
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE \`service.name\` == "claim-intake"
| LIMIT 500`,
      },
      {
        title: 'High-volume fraud-check slice',
        description: 'Secondary hub burst traffic.',
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE \`service.name\` == "fraud-check"
| LIMIT 500`,
      },
    ],
    insights: [
      {
        title: 'Traffic skew across hubs and leaves',
        description:
          'claim-intake and fraud-check show elevated volume while leaf services remain sparse.',
        impact: 'high',
        recommendations: [
          'Confirm autoscaling policies on hub deployments.',
          'Watch downstream queue depth for kafka-backed edges.',
        ],
      },
    ],
  },

  fraud_check_timeout: {
    scenarioName: 'fraud_check_timeout',
    queries: [
      {
        title: 'Gateway timeout corpus — fraud-check',
        description: 'Deadline exceeded / upstream timeout lines on fraud-check.',
        severityScore: 9,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE \`service.name\` == "fraud-check" AND (message LIKE "*deadline*" OR message LIKE "*timeout*" OR message LIKE "*504*")
| LIMIT 500`,
      },
      {
        title: 'Circuit-breaker warn ramp',
        description: 'Warn-stage gateway timeout ramp preceding full incident.',
        severityScore: 7,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE message LIKE "*circuit breaker*" OR message LIKE "*error rate*"
| LIMIT 500`,
      },
    ],
    insights: [
      {
        title: 'Fraud scoring latency breach',
        description:
          'Gateway timeouts on fraud-check precede caller-visible degradation at claim-intake.',
        impact: 'critical',
        recommendations: [
          'Scale fraud model inference or add caching for hot features.',
          'Inspect downstream gRPC/http deadlines.',
        ],
      },
    ],
  },

  fraud_check_redis_herring: {
    scenarioName: 'fraud_check_redis_herring',
    queries: [
      {
        title: 'Primary fraud gateway timeouts',
        description: 'True incident: fraud-check deadline / upstream timeout errors.',
        severityScore: 9,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE \`service.name\` == "fraud-check" AND (message LIKE "*deadline*" OR message LIKE "*Upstream timeout*" OR message LIKE "*timeout*")
| LIMIT 500`,
      },
      {
        title: 'Redis / Kafka red-herring mentions',
        description:
          'Ghost mention lines (Redis/Kafka) that can mislead without fraud-check timeouts.',
        severityScore: 4,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE message LIKE "*Redis*" OR message LIKE "*Kafka*" OR message LIKE "*consumer lag*"
| LIMIT 500`,
      },
    ],
    insights: [
      {
        title: 'Distinguish fraud timeouts from infra noise',
        description:
          'Redis/Kafka chatter co-occurs with gateway timeouts — triage on fraud-check SLIs first.',
        impact: 'high',
        recommendations: [
          'Correlate fraud-check error budget with gateway timeout spikes.',
          'Validate Redis/Kafka health is green before chasing herrings.',
        ],
      },
    ],
  },

  db_oom_crashloop: {
    scenarioName: 'db_oom_crashloop',
    queries: [
      {
        title: 'Postgres timeout stage',
        description: 'Stage 1 postgres saturation signals.',
        severityScore: 9,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE message LIKE "*postgres*" OR message LIKE "*pgx*" OR message LIKE "*duration:*ms*statement*"
| LIMIT 500`,
      },
      {
        title: 'OOM and crash-loop on claim-intake',
        description: 'Stage 2–3 kubelet OOM / crash-loop lines and java/node OOM messages.',
        severityScore: 10,
        esql: (streamName: string) =>
          `${fromStream(streamName)}
| WHERE message LIKE "*OOM*" OR message LIKE "*OutOfMemory*" OR message LIKE "*back-off*" OR message LIKE "*CrashLoop*" OR \`service.name\` == "claim-intake"
| LIMIT 500`,
      },
    ],
    insights: [
      {
        title: 'Escalating failure chain: DB → OOM → crash loop',
        description:
          'Postgres pressure triggers retry amplification, OOM on claim-intake, then crash-loop recovery struggles.',
        impact: 'critical',
        recommendations: [
          'Stabilize postgres before scaling claim-intake replicas.',
          'Raise memory limits or shed load while crash-loop persists.',
        ],
      },
    ],
  },
};
