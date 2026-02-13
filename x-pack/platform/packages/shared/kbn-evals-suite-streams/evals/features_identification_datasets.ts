/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion } from '@kbn/evals';

export const VALID_FEATURE_TYPES = [
  'entity',
  'infrastructure',
  'technology',
  'dependency',
] as const;
export type ValidFeatureType = (typeof VALID_FEATURE_TYPES)[number];

export interface FeatureIdentificationEvaluationExample {
  input: {
    sample_documents: Array<Record<string, any>>;
  };
  output: {
    criteria: EvaluationCriterion[];
    weight?: number;
    min_features?: number;
    max_features?: number;
    max_confidence?: number;
    required_types?: ValidFeatureType[];
    forbidden_types?: ValidFeatureType[];
  };
  metadata: {
    description?: string;
  };
}

export interface FeatureIdentificationEvaluationDataset {
  name: string;
  description: string;
  examples: FeatureIdentificationEvaluationExample[];
}

const OBVIOUS_EVIDENCE_EXAMPLES: FeatureIdentificationEvaluationExample[] = [
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-01-12T10:00:00.001Z',
          message:
            'checkout-api v4.8.0 initializing... runtime: Go go1.22.1 arch=linux/amd64 build=9f2c1a7',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.090Z',
          message: 'system info: Ubuntu 22.04.3 LTS (Jammy Jellyfish) kernel 5.15.0-89',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.215Z',
          message:
            'db connection OK: PostgreSQL 16.1 on x86_64-pc-linux-gnu @ checkout-db.internal:5432/checkout (ssl enabled)',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.310Z',
          message:
            'cache connection successful redis-cache.internal:6379 server_version=7.2.5 mode=standalone',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.501Z',
          message:
            'retrieved cloud metadata successfully provider=aws region=us-east-1 account_id=123456789012',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.612Z',
          message:
            'running in kubernetes pod=checkout-api-79c64f4c9d-2j9bz ns=prod worker_node=ip-10-0-1-12',
          'k8s.pod.name': 'checkout-api-79c64f4c9d-2j9bz',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.730Z',
          message:
            'outbound request: POST http://fraud-svc.internal:8081/check -> fraud-service responded 200 in 32ms',
          'service.name': 'checkout-api',
          'http.method': 'POST',
          'peer.service': 'fraud-service',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.901Z',
          message:
            'external api call POST https://api.stripe.com/v1/payment_intents completed status=200 target=stripe',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:01.140Z',
          message: 'migration tool: goose v3.18.0 applied 3 pending migrations',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:01.320Z',
          message: 'health endpoint /ready responding with 200',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-checkout-api',
          text: 'Must identify checkout-api as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-postgres-db',
          text: 'Must identify the PostgreSQL database as a feature with type "entity" and subtype "database"',
          score: 2,
        },
        {
          id: 'entity-redis-cache',
          text: 'Must identify the Redis cache as a feature with type "entity" and subtype "cache"',
          score: 2,
        },
        {
          id: 'tech-go',
          text: 'Must identify Go as a technology feature with version matching "go1.22.1" or "1.22.1"',
          score: 1,
        },
        {
          id: 'infra-aws',
          text: 'Must identify AWS as an infrastructure feature with subtype "cloud_deployment"',
          score: 1,
        },
        {
          id: 'infra-k8s',
          text: 'Must identify Kubernetes as an infrastructure feature with subtype "container_orchestration"',
          score: 1,
        },
        {
          id: 'infra-ubuntu',
          text: 'Must identify Ubuntu as an infrastructure feature with version "22.04.3"',
          score: 1,
        },
        {
          id: 'dep-fraud-service',
          text: 'Must identify the dependency from checkout-api to fraud-service',
          score: 1,
        },
        {
          id: 'dep-stripe',
          text: 'Must identify the dependency from checkout-api to stripe',
          score: 1,
        },
        {
          id: 'meta-separation',
          text: 'Pod names and node identifiers must appear in meta, not in properties; technology names and versions must appear in properties',
          score: 1,
        },
      ],
      min_features: 5,
      required_types: ['entity', 'technology', 'infrastructure', 'dependency'],
    },
    metadata: {
      description: 'Go microservice on AWS/K8s with explicit version strings for all components',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-02-05T14:30:00.010Z',
          message:
            'OrderService bootstrap: Java 21.0.2, Spring Boot 3.2.1, host order-svc-7d8f9c running CentOS Stream 9',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.150Z',
          message:
            'HikariPool-1 starting up... driver: MySQL Connector/J 8.2.0 autoCommit=false poolSize=10',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.280Z',
          message:
            'MySQL 8.0.35 connection established mysql-primary.internal:3306 schema=orders charset=utf8mb4',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.410Z',
          message:
            'initialized Kafka producer config: brokers=kafka-broker.internal:9092 client.version=Apache Kafka 3.6.1',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.520Z',
          message:
            'loaded GCP environment: project_id=acme-prod compute_zone=us-central1-f vm_instance=order-svc-7d8f9c',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.640Z',
          message:
            'service registration complete: Eureka registry order-service @ 10.128.0.15:8080 status=UP',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.780Z',
          message:
            'Feign HTTP client ready: target inventory-service url=http://inventory.internal:8080',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.900Z',
          message: 'upstream GET /api/stock?sku=ABC123 inventory-service returned 200 elapsed=45ms',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:01.020Z',
          message: 'embedded Tomcat listening 0.0.0.0:8080 protocol=http contextPath=""',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:01.150Z',
          message:
            '{"event":"app_ready","app_start_ms":2140,"jvm_uptime_ms":3010,"gc_pauses":2,"heap_used_mb":512}',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-order-service',
          text: 'Must identify order-service as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-mysql-db',
          text: 'Must identify MySQL as a feature with type "entity" and subtype "database" with version "8.0.35"',
          score: 2,
        },
        {
          id: 'entity-kafka',
          text: 'Must identify Kafka as a feature with type "entity" and subtype "message_queue"',
          score: 2,
        },
        {
          id: 'tech-java',
          text: 'Must identify Java as a technology feature with version "21.0.2"',
          score: 1,
        },
        {
          id: 'tech-spring-boot',
          text: 'Must identify Spring Boot as a technology feature with version "3.2.1"',
          score: 1,
        },
        {
          id: 'infra-gcp',
          text: 'Must identify GCP as an infrastructure feature with subtype "cloud_deployment"',
          score: 1,
        },
        {
          id: 'infra-centos',
          text: 'Must identify CentOS Stream 9 as an infrastructure feature with subtype "operating_system"',
          score: 1,
        },
        {
          id: 'dep-inventory-service',
          text: 'Must identify the dependency from order-service to inventory-service',
          score: 1,
        },
        {
          id: 'meta-separation',
          text: 'Stable identifiers (service names, technology names) must be in properties; variable data (VM instance names, IPs) in meta',
          score: 1,
        },
      ],
      min_features: 5,
      required_types: ['entity', 'technology', 'infrastructure', 'dependency'],
    },
    metadata: {
      description: 'Java Spring Boot microservice on GCP with MySQL and Kafka',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-03-18T08:45:00.005Z',
          message:
            'telemetry-collector v1.2.0 boot sequence rustc 1.75.0 target=x86_64-unknown-linux-gnu opt-level=3',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.120Z',
          message: 'os info from /etc/os-release: Debian GNU/Linux 12 codename=bookworm',
          'service.name': 'telemetry-collector',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.250Z',
          message:
            'mongo client connected mongodb://telemetry-mongo.internal:27017 db_version=7.0.4 topology=standalone',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.380Z',
          message:
            'messaging layer ready: nats://nats.internal:4222 server=NATS Server v2.10.7 cluster_support=true',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.490Z',
          message: 'cloud environment detected: Azure sub=abc123 region=westus2 vm=vm-telemetry-01',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.600Z',
          message:
            '{"component":"metrics","bind":"0.0.0.0:9090","path":"/metrics","format":"prometheus","scrape_interval_ms":15000}',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.710Z',
          message: 'grpc transport listening [::]:50051 http2=enabled tls=optional',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.830Z',
          message:
            'rpc to metrics-aggregator successful: /telemetry.Metrics/Push status=OK latency=12ms',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.940Z',
          message: 'async runtime: Tokio workers=4 threads=4 blocking_threads=512',
          'service.name': 'telemetry-collector',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-03-18T08:45:01.050Z',
          message: 'accepting traffic on all configured ports',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-telemetry-collector',
          text: 'Must identify telemetry-collector as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-mongodb',
          text: 'Must identify MongoDB as a feature with type "entity" and subtype "database" with version "7.0.4"',
          score: 2,
        },
        {
          id: 'entity-nats',
          text: 'Must identify NATS as a feature with type "entity" and subtype "message_queue"',
          score: 2,
        },
        {
          id: 'tech-rust',
          text: 'Must identify Rust as a technology feature with version "1.75.0"',
          score: 1,
        },
        {
          id: 'infra-azure',
          text: 'Must identify Azure as an infrastructure feature with subtype "cloud_deployment"',
          score: 1,
        },
        {
          id: 'infra-debian',
          text: 'Must identify Debian GNU/Linux 12 as an infrastructure feature with subtype "operating_system"',
          score: 1,
        },
        {
          id: 'dep-metrics-aggregator',
          text: 'Must identify the gRPC dependency from telemetry-collector to metrics-aggregator',
          score: 1,
        },
        {
          id: 'meta-separation',
          text: 'Subscription IDs and VM identifiers must appear in meta, not in properties',
          score: 1,
        },
      ],
      min_features: 5,
      required_types: ['entity', 'technology', 'infrastructure', 'dependency'],
    },
    metadata: {
      description: 'Rust service on Azure with MongoDB and NATS',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-04-22T16:15:00.008Z',
          message: 'search-api process started: Node.js v20.11.0 engine=V8 11.3.244.8',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.140Z',
          message: 'web server config: Express 4.18.2 middleware=[compression, helmet, cors]',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.270Z',
          message:
            'search backend connected https://es-cluster.internal:9200 cluster_version=8.12.0 status=green',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.400Z',
          message:
            'cache cluster ready: redis-cluster.internal nodes=[6379,6380,6381] version=7.0.12 mode=cluster',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.510Z',
          message: 'platform info: Red Hat Enterprise Linux 8.9 kernel=4.18.0-513.el8.x86_64',
          'service.name': 'search-api',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.620Z',
          message: 'cloud detection failed, deployment appears to be on-premises',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.730Z',
          message:
            'outgoing request POST /api/recommend -> recommendation-engine responded 200 took=89ms',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.840Z',
          message: 'http listener active 0.0.0.0:3000',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.950Z',
          message: 'index warmup complete: 12 indices loaded docs_count=2400000',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:01.060Z',
          message:
            'Error: ECONNRESET socket hang up\n    at connResetException (node:internal/errors:720:14)\n    at TLSSocket.socketOnEnd (node:_http_client:518:23)',
          'service.name': 'search-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-04-22T16:15:01.170Z',
          message: 'retrying recommendation-engine request attempt=2 backoff=500ms',
          'service.name': 'search-api',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-04-22T16:15:01.780Z',
          message: 'healthcheck route mounted: GET /health',
          'service.name': 'search-api',
          'log.level': 'DEBUG',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-search-api',
          text: 'Must identify search-api as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-elasticsearch',
          text: 'Must identify Elasticsearch as a feature with type "entity" and subtype "database" or similar, with version "8.12.0"',
          score: 2,
        },
        {
          id: 'entity-redis',
          text: 'Must identify Redis as a feature with type "entity" and subtype "cache" with version "7.0.12"',
          score: 2,
        },
        {
          id: 'tech-nodejs',
          text: 'Must identify Node.js as a technology feature with version "20.11.0"',
          score: 1,
        },
        {
          id: 'tech-express',
          text: 'Must identify Express as a technology feature with version "4.18.2"',
          score: 1,
        },
        {
          id: 'infra-rhel',
          text: 'Must identify Red Hat Enterprise Linux as an infrastructure feature with version "8.9"',
          score: 1,
        },
        {
          id: 'dep-recommendation-engine',
          text: 'Must identify the dependency from search-api to recommendation-engine',
          score: 1,
        },
        {
          id: 'no-cloud-provider',
          text: 'Must NOT identify any cloud provider since the logs explicitly say "cloud detection failed, deployment appears to be on-premises"',
          score: 2,
        },
      ],
      min_features: 4,
      required_types: ['entity', 'technology', 'infrastructure', 'dependency'],
    },
    metadata: {
      description: 'Node.js Express service on-prem with Elasticsearch and Redis cluster',
    },
  },

  // Edge case: Logs with significant noise - testing signal extraction
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-05-10T09:15:22.401Z',
          message: 'worker-pool initializing threads=8 queue_size=1000',
          'service.name': 'data-processor',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-05-10T09:15:23.105Z',
          message: 'runtime info: Python 3.10.8 CPython',
          'service.name': 'data-processor',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-05-10T09:15:23.630Z',
          message: 'db client ready: PostgreSQL 14.7 host=db-primary.local:5432',
          'service.name': 'data-processor',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-05-10T09:15:24.012Z',
          message: 'cloud env detected provider=aws region=us-west-2',
          'service.name': 'data-processor',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-05-10T10:30:44.105Z',
          message: 'memory stats: heap_used=1.2GB heap_max=4.0GB gc_count=47',
          'service.name': 'data-processor',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-05-10T10:30:44.315Z',
          message: 'request latency: p50=45ms p95=120ms p99=340ms',
          'service.name': 'data-processor',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-05-10T11:45:12.420Z',
          message: 'cache hit ratio: 0.847 total_requests=45892',
          'service.name': 'data-processor',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-05-10T11:45:12.525Z',
          message: 'thread pool: active=3 idle=5 completed=8947',
          'service.name': 'data-processor',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-05-10T12:00:00.735Z',
          message: 'queue depth: pending=127 processing=8 completed=9483',
          'service.name': 'data-processor',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-05-10T12:00:00.840Z',
          message: 'network stats: bytes_in=847MB bytes_out=1.2GB packets=847291',
          'service.name': 'data-processor',
          'log.level': 'DEBUG',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-data-processor',
          text: 'Must identify data-processor as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-postgres-db',
          text: 'Must identify PostgreSQL as a feature with type "entity" and subtype "database" with version "14.7"',
          score: 2,
        },
        {
          id: 'tech-python',
          text: 'Must identify Python as a technology feature with version "3.10.8"',
          score: 1,
        },
        {
          id: 'infra-aws',
          text: 'Must identify AWS as an infrastructure feature with subtype "cloud_deployment"',
          score: 1,
        },
        {
          id: 'no-metrics-features',
          text: 'Must NOT extract features from operational metrics lines (heap stats, latency percentiles, cache ratios, thread pool stats, network stats, queue depth)',
          score: 2,
        },
      ],
      min_features: 3,
      required_types: ['entity', 'technology', 'infrastructure'],
    },
    metadata: {
      description: 'Signal extraction from noisy logs with operational metrics',
    },
  },

  // Edge case: Version upgrade detected in logs
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-06-01T08:00:00.010Z',
          message: 'app starting: Node.js v18.16.0 express=4.18.2',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-01T08:00:00.140Z',
          message: 'connected to MongoDB 6.0.4 replica-set=rs0',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-01T08:05:23.510Z',
          message: 'performing rolling update to Node.js v20.11.0',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-01T08:05:45.220Z',
          message: 'graceful shutdown initiated drain_timeout=30s',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-01T08:06:18.105Z',
          message: 'restarted: Node.js v20.11.0 express=4.18.2 pid=84721',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-01T08:06:18.340Z',
          message: 'reconnected MongoDB 6.0.4 connections=10 latency=2ms',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-api-gateway',
          text: 'Must identify api-gateway as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-mongodb',
          text: 'Must identify MongoDB as a feature with type "entity" and subtype "database" with version "6.0.4"',
          score: 2,
        },
        {
          id: 'tech-nodejs-latest',
          text: 'Must identify Node.js with the most recent version "20.11.0", not the older "18.16.0"',
          score: 2,
        },
        {
          id: 'tech-express',
          text: 'Must identify Express as a technology feature with version "4.18.2" (stable across upgrade)',
          score: 1,
        },
        {
          id: 'version-upgrade-handling',
          text: 'Should handle the version upgrade correctly — the older version may optionally be noted in meta.observed_versions or meta.note',
          score: 1,
        },
      ],
      min_features: 2,
      required_types: ['entity', 'technology'],
    },
    metadata: {
      description: 'Version upgrade during log window',
    },
  },
];

const INFERENCE_REQUIRED_EXAMPLES: FeatureIdentificationEvaluationExample[] = [
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-01-13T07:20:00.010Z',
          message:
            'Traceback (most recent call last): File "/app/worker.py", line 88, in run\n  import pandas as pd\nModuleNotFoundError: No module named \'pandas\'',
          'service.name': 'etl-worker',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-01-13T07:20:01.102Z',
          message: 'pip freeze: pandas==2.1.4 numpy==1.26.2 scikit-learn==1.4.0',
          'service.name': 'etl-worker',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-13T07:20:02.220Z',
          message: 'psycopg2.OperationalError: could not translate host name "orders-db.internal"',
          'service.name': 'etl-worker',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-01-13T07:20:02.540Z',
          message:
            'SQLSTATE=08001 connection exception while connecting to orders-db.internal:5432',
          'service.name': 'etl-worker',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-01-13T07:20:03.110Z',
          message:
            'redis.clients.jedis.exceptions.JedisConnectionException: Failed connecting to cache.internal:6379',
          'service.name': 'etl-worker',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-01-13T07:20:04.010Z',
          message:
            'Metadata server reachable at http://metadata.google.internal/computeMetadata/v1/',
          'service.name': 'etl-worker',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-13T07:20:04.120Z',
          message: 'Detected zone from metadata: us-central1-a',
          'service.name': 'etl-worker',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-13T07:20:04.980Z',
          message: 'kube-probe/1.29 readiness check GET /ready -> 200',
          'service.name': 'etl-worker',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-01-13T07:20:05.430Z',
          message:
            'Mounted serviceaccount token at /var/run/secrets/kubernetes.io/serviceaccount/token',
          'service.name': 'etl-worker',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-13T07:20:06.880Z',
          message: 'Wrote results to s3://analytics-results/jobs/20260113-0720/output.parquet',
          'service.name': 'etl-worker',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-13T07:20:07.240Z',
          message:
            'Request to upstream service: GET https://inventory.internal/api/v1/items -> 200',
          'service.name': 'etl-worker',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-etl-worker',
          text: 'Must identify etl-worker as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'tech-python',
          text: 'Must identify Python as a technology feature, inferred from the traceback pattern and .py file references',
          score: 1,
        },
        {
          id: 'entity-postgres-db',
          text: 'Must identify a PostgreSQL database as a feature (inferred from psycopg2 driver and port 5432)',
          score: 2,
        },
        {
          id: 'entity-redis-cache',
          text: 'Must identify a Redis cache as a feature (inferred from Jedis client library)',
          score: 2,
        },
        {
          id: 'infra-gcp',
          text: 'Must identify GCP as an infrastructure feature, inferred from metadata.google.internal URL and zone format',
          score: 1,
        },
        {
          id: 'infra-k8s',
          text: 'Must identify Kubernetes as an infrastructure feature, inferred from kube-probe and serviceaccount token path',
          score: 1,
        },
        {
          id: 'inferred-tagging',
          text: 'Features identified from indirect signals must be tagged as "inferred" with meta.note explaining the reasoning',
          score: 1,
        },
        {
          id: 'confidence-calibration',
          text: 'Inferred features must have moderate confidence levels (not above 80) since evidence is indirect',
          score: 1,
        },
        {
          id: 'no-invented-versions',
          text: 'Must NOT invent version numbers not present in the logs — PostgreSQL, Redis, and GCP versions should be absent or marked unknown',
          score: 2,
        },
      ],
      min_features: 4,
      required_types: ['entity', 'technology', 'infrastructure'],
    },
    metadata: {
      description: 'Python worker with implicit tech signals (tracebacks, client libs, metadata)',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-02-14T11:30:00.015Z',
          message:
            "NoMethodError: undefined method 'length' for nil:NilClass\n  from /app/lib/user_service.rb:42:in `validate'",
          'service.name': 'user-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-02-14T11:30:00.130Z',
          message: 'bundle exec puma -C config/puma.rb starting...',
          'service.name': 'user-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-14T11:30:00.250Z',
          message:
            'ActiveRecord::ConnectionNotEstablished: connection to server at "pg.internal" (10.0.1.50), port 5432 failed',
          'service.name': 'user-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-02-14T11:30:00.370Z',
          message:
            'Sidekiq client pushing job UserSyncJob to redis://sidekiq-redis.internal:6379/0',
          'service.name': 'user-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-14T11:30:00.480Z',
          message: 'aws-sdk-core: resolved region from IMDS: eu-west-1',
          'service.name': 'user-api',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-14T11:30:00.590Z',
          message: 'ECS task metadata endpoint: http://169.254.170.2/v4/abc123',
          'service.name': 'user-api',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-14T11:30:00.700Z',
          message: 'ActionMailer delivering via SMTP to email-service.internal:587',
          'service.name': 'user-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-14T11:30:00.810Z',
          message:
            'Faraday::ConnectionFailed calling notification-api at https://notify.internal/send',
          'service.name': 'user-api',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-02-14T11:30:00.920Z',
          message:
            'Rack middleware stack loaded: Rack::Runtime, Rack::MethodOverride, ActionDispatch::...',
          'service.name': 'user-api',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-14T11:30:01.030Z',
          message: 'Listening on tcp://0.0.0.0:3000',
          'service.name': 'user-api',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-user-api',
          text: 'Must identify user-api as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'tech-ruby',
          text: 'Must identify Ruby as a technology feature, inferred from .rb file extensions and NoMethodError pattern',
          score: 1,
        },
        {
          id: 'tech-rails',
          text: 'Must identify Rails as a technology feature, inferred from ActiveRecord, ActionMailer, ActionDispatch, and Rack middleware',
          score: 1,
        },
        {
          id: 'entity-postgres-db',
          text: 'Must identify a PostgreSQL database as a feature, inferred from ActiveRecord connection to pg.internal on port 5432',
          score: 2,
        },
        {
          id: 'entity-redis',
          text: 'Must identify Redis as a feature, inferred from Sidekiq pushing jobs to redis:// URL',
          score: 2,
        },
        {
          id: 'infra-aws',
          text: 'Must identify AWS as an infrastructure feature, inferred from aws-sdk-core IMDS resolution',
          score: 1,
        },
        {
          id: 'infra-ecs',
          text: 'Must identify ECS as an infrastructure feature, inferred from the ECS task metadata endpoint (169.254.170.2)',
          score: 1,
        },
        {
          id: 'inferred-tagging',
          text: 'Inferred features must have "inferred" tag and meta.note explaining the reasoning',
          score: 1,
        },
        {
          id: 'confidence-calibration',
          text: 'Confidence levels should reflect indirect evidence — not above 80 for inferred features',
          score: 1,
        },
      ],
      min_features: 4,
      required_types: ['entity', 'technology', 'infrastructure'],
    },
    metadata: {
      description: 'Ruby Rails service with implicit signals from framework internals and AWS SDK',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-03-08T09:45:00.012Z',
          message:
            'PHP Fatal error: Uncaught TypeError: array_merge(): Argument #1 must be of type array in /var/www/app/src/Controller/ProductController.php:78',
          'service.name': 'catalog-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-03-08T09:45:00.140Z',
          message: 'composer.lock: laravel/framework v10.40.0, doctrine/dbal 3.8.0',
          'service.name': 'catalog-api',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-03-08T09:45:00.260Z',
          message:
            'PDOException: SQLSTATE[HY000] [2002] Connection refused (trying mariadb.internal:3306)',
          'service.name': 'catalog-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-03-08T09:45:00.380Z',
          message:
            'Predis\\Connection\\ConnectionException: Connection refused [tcp://redis.internal:6379]',
          'service.name': 'catalog-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-03-08T09:45:00.500Z',
          message: 'DigitalOcean Spaces SDK: endpoint=nyc3.digitaloceanspaces.com',
          'service.name': 'catalog-api',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-03-08T09:45:00.610Z',
          message: 'Droplet metadata: id=123456789 region=nyc3 hostname=catalog-web-01',
          'service.name': 'catalog-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-08T09:45:00.720Z',
          message: 'php-fpm: pool www: started with 5 workers',
          'service.name': 'catalog-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-08T09:45:00.830Z',
          message:
            'GuzzleHttp\\Exception\\ConnectException calling pricing-service at http://pricing.internal/api/v1/prices',
          'service.name': 'catalog-api',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-03-08T09:45:00.940Z',
          message: 'artisan queue:work processing jobs from beanstalkd://queue.internal:11300',
          'service.name': 'catalog-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-08T09:45:01.050Z',
          message: 'nginx/1.24.0 upstream sent too big header',
          'service.name': 'catalog-api',
          'log.level': 'WARN',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-catalog-api',
          text: 'Must identify catalog-api as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'tech-php',
          text: 'Must identify PHP as a technology feature, inferred from PHP Fatal error and php-fpm',
          score: 1,
        },
        {
          id: 'tech-laravel',
          text: 'Must identify Laravel as a technology feature, inferred from composer.lock, artisan, and laravel/framework reference',
          score: 1,
        },
        {
          id: 'entity-mariadb',
          text: 'Must identify MariaDB as a feature with type "entity" and subtype "database", inferred from PDOException connecting to mariadb.internal',
          score: 2,
        },
        {
          id: 'entity-redis',
          text: 'Must identify Redis as a feature, inferred from Predis client library connection',
          score: 2,
        },
        {
          id: 'tech-nginx',
          text: 'Must identify Nginx as a technology feature with version "1.24.0" — this has explicit version evidence so confidence can be higher',
          score: 1,
        },
        {
          id: 'infra-digitalocean',
          text: 'Must identify DigitalOcean as an infrastructure feature, inferred from Droplet metadata and Spaces SDK',
          score: 1,
        },
        {
          id: 'inferred-tagging',
          text: 'Features inferred from indirect evidence must be tagged as "inferred" with meta.note explanation',
          score: 1,
        },
        {
          id: 'confidence-calibration',
          text: 'Inferred features should have moderate confidence; Nginx with explicit version can have higher confidence',
          score: 1,
        },
      ],
      min_features: 5,
      required_types: ['entity', 'technology', 'infrastructure'],
    },
    metadata: {
      description: 'PHP Laravel service on DigitalOcean with MariaDB',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-04-12T15:20:00.018Z',
          message:
            'java.lang.NullPointerException\n\tat com.acme.analytics.DataProcessor$.process(DataProcessor.scala:112)',
          'service.name': 'analytics-engine',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-04-12T15:20:00.150Z',
          message: 'sbt 1.9.8 / Scala 3.3.1 / JVM 21 (Eclipse Adoptium)',
          'service.name': 'analytics-engine',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-04-12T15:20:00.280Z',
          message: 'akka.actor.ActorSystem[analytics-system] starting with 8 dispatcher threads',
          'service.name': 'analytics-engine',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-12T15:20:00.410Z',
          message:
            'slick.jdbc.JdbcBackend: connecting to jdbc:postgresql://analytics-db.internal:5432/analytics',
          'service.name': 'analytics-engine',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-12T15:20:00.530Z',
          message:
            'com.datastax.oss.driver.api.core: connected to cassandra.internal:9042 (Cassandra 4.1.3)',
          'service.name': 'analytics-engine',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-12T15:20:00.650Z',
          message: 'IBM Cloud metadata: region=us-south zone=dal10 instance=analytics-vsi-01',
          'service.name': 'analytics-engine',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-04-12T15:20:00.760Z',
          message: 'akka-http listening on 0.0.0.0:8080',
          'service.name': 'analytics-engine',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-12T15:20:00.870Z',
          message: 'Apache Spark session created (spark.master=spark://spark-master.internal:7077)',
          'service.name': 'analytics-engine',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-12T15:20:00.980Z',
          message:
            'REST call to reporting-service: POST https://reporting.internal/api/report -> 200',
          'service.name': 'analytics-engine',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-12T15:20:01.090Z',
          message: 'JVM heap: 4096MB max, 2048MB used',
          'service.name': 'analytics-engine',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-04-12T15:20:01.210Z',
          message: 'FATAL: OutOfMemoryError in analytics-system-dispatcher-3, restarting actor',
          'service.name': 'analytics-engine',
          'log.level': 'FATAL',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-analytics-engine',
          text: 'Must identify analytics-engine as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'tech-scala',
          text: 'Must identify Scala as a technology feature (from .scala file extension and sbt build tool), distinct from Java',
          score: 2,
        },
        {
          id: 'entity-postgres-db',
          text: 'Must identify a PostgreSQL database as a feature, inferred from slick JDBC connecting to jdbc:postgresql://...',
          score: 2,
        },
        {
          id: 'entity-cassandra',
          text: 'Must identify Cassandra as a feature with type "entity" and subtype "database" with explicit version "4.1.3"',
          score: 2,
        },
        {
          id: 'infra-ibm-cloud',
          text: 'Must identify IBM Cloud as an infrastructure feature, inferred from IBM Cloud metadata',
          score: 1,
        },
        {
          id: 'dep-reporting-service',
          text: 'Must identify the dependency from analytics-engine to reporting-service',
          score: 1,
        },
        {
          id: 'inferred-tagging',
          text: 'Scala, PostgreSQL, and IBM Cloud must be tagged as "inferred" with meta.note explaining the reasoning',
          score: 1,
        },
        {
          id: 'confidence-calibration',
          text: 'Cassandra has explicit version evidence and should have higher confidence than inferred features like PostgreSQL or IBM Cloud',
          score: 1,
        },
      ],
      min_features: 4,
      required_types: ['entity', 'technology', 'infrastructure', 'dependency'],
    },
    metadata: {
      description: 'Scala/Akka service on IBM Cloud with Cassandra and Spark',
    },
  },

  // Edge case: Polyglot service with multiple languages
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-05-15T10:30:00.010Z',
          message: 'main service started: Go 1.21.4 pid=12847',
          'service.name': 'hybrid-processor',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-05-15T10:30:00.150Z',
          message: 'ML worker subprocess spawned: /usr/bin/python3 /app/ml/predictor.py',
          'service.name': 'hybrid-processor',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-05-15T10:30:00.280Z',
          message: 'python worker ready: scikit-learn==1.3.0 pandas==2.0.3',
          'service.name': 'hybrid-processor',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-05-15T10:30:00.410Z',
          message: 'net/http server listening :8080',
          'service.name': 'hybrid-processor',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-05-15T10:30:00.540Z',
          message: 'ImportError: No module named tensorflow',
          'service.name': 'hybrid-processor',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-05-15T10:30:00.670Z',
          message: 'fallback to sklearn-based model',
          'service.name': 'hybrid-processor',
          'log.level': 'WARN',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-hybrid-processor',
          text: 'Must identify hybrid-processor as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'tech-go',
          text: 'Must identify Go as a technology feature with explicit version "1.21.4"',
          score: 1,
        },
        {
          id: 'tech-python',
          text: 'Must identify Python as a separate technology feature, inferred from subprocess spawn and python library imports',
          score: 1,
        },
        {
          id: 'polyglot-separation',
          text: 'Go and Python must be identified as separate technology features — not merged into one',
          score: 2,
        },
        {
          id: 'confidence-calibration',
          text: 'Go should have higher confidence (explicit version) than Python (inferred from subprocess context)',
          score: 1,
        },
        {
          id: 'no-tensorflow',
          text: 'Must NOT identify TensorFlow as a technology since the ImportError shows it is not available',
          score: 2,
        },
      ],
      min_features: 2,
      required_types: ['entity', 'technology'],
    },
    metadata: {
      description: 'Polyglot service with Go main process and Python ML subprocess',
    },
  },
];

const AMBIGUOUS_EVIDENCE_EXAMPLES: FeatureIdentificationEvaluationExample[] = [
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-01-14T18:00:00.010Z',
          message: 'connect timeout: port 9042 exceeded 5000ms deadline remote=10.2.1.15',
          'service.name': 'edge-gateway',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-01-14T18:00:00.340Z',
          message: 'operation failed error_code=E11000 collection=users op=insert',
          'service.name': 'edge-gateway',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-01-14T18:00:00.690Z',
          message: 'lookup latency high key="user:123" elapsed=180ms threshold_exceeded=true',
          'service.name': 'edge-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-14T18:00:01.020Z',
          message: 'eviction: temporary_store key expired ttl_seconds=300 reason=timeout',
          'service.name': 'edge-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-14T18:00:01.380Z',
          message:
            'Upstream connect error or disconnect/reset before headers. reset reason: connection failure',
          'service.name': 'edge-gateway',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-01-14T18:00:02.040Z',
          message: 'Failed to parse JSON: Unexpected token } in JSON at position 381',
          'service.name': 'edge-gateway',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-01-14T18:00:02.410Z',
          message: 'java.lang.IllegalArgumentException: invalid argument "ttl" (client error)',
          'service.name': 'edge-gateway',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-01-14T18:00:02.780Z',
          message: 'TypeError: Cannot read properties of undefined (reading "length")',
          'service.name': 'edge-gateway',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-01-14T18:00:03.470Z',
          message: 'Connected to 10.2.3.4:5432 (connection established)',
          'service.name': 'edge-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-14T18:00:04.590Z',
          message: 'Retrying request (attempt=2) due to upstream timeout',
          'service.name': 'edge-gateway',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'no-entity-from-ports',
          text: 'Must NOT create entity features (database, cache) based solely on port numbers (9042, 5432) without corroborating technology-specific evidence',
          score: 2,
        },
        {
          id: 'no-cache-from-ttl',
          text: 'Must NOT identify a specific cache vendor from generic "cache", "ttl", or "eviction" keywords',
          score: 2,
        },
        {
          id: 'no-language-from-mixed-errors',
          text: 'Must NOT confidently identify a programming language when both Java and JavaScript error patterns appear without a dominant signal',
          score: 2,
        },
        {
          id: 'inferred-tag-if-emitted',
          text: 'Any features extracted must be tagged as "inferred" with meta.note explaining the weak reasoning',
          score: 1,
        },
      ],
      max_features: 2,
      max_confidence: 50,
    },
    metadata: {
      description: 'Mixed signals: Java exception, JS TypeError, port hints - none corroborate',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-02-20T10:15:00.020Z',
          message: 'inbound GET /api/redis/status from 172.16.8.45:52841 user_agent=curl/8.0',
          'service.name': 'api-proxy',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.150Z',
          message:
            'healthcheck upstream=postgres-primary target=http://health.internal/pg interval=30s',
          'service.name': 'api-proxy',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.280Z',
          message: 'pool stats max=10 active=3 idle=7 pending=0 wait_count=142',
          'service.name': 'api-proxy',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.410Z',
          message: 'rate_limit config=1000req/min bucket=global client_ip=172.16.8.45',
          'service.name': 'api-proxy',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.540Z',
          message:
            'request processing customer_id=mongodb-inc account_tier=enterprise region=us-east',
          'service.name': 'api-proxy',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.670Z',
          message: 'Forwarding to backend server at 10.0.0.50:8080',
          'service.name': 'api-proxy',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.800Z',
          message: 'TLS version 1.3 negotiated with client',
          'service.name': 'api-proxy',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.930Z',
          message: 'Response sent status=200 latency_ms=45',
          'service.name': 'api-proxy',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-20T10:15:01.060Z',
          message: 'Metrics exported: request_count=1234 error_rate=0.01',
          'service.name': 'api-proxy',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-20T10:15:01.190Z',
          message: 'Configuration reloaded from /etc/api-proxy/config.yaml',
          'service.name': 'api-proxy',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'no-redis-from-path',
          text: 'Must NOT identify Redis from the URL path "/api/redis/status" — this is an API route, not infrastructure evidence',
          score: 2,
        },
        {
          id: 'no-postgres-from-label',
          text: 'Must NOT identify PostgreSQL from the upstream label "postgres-primary" — this is a health check target name, not a database connection',
          score: 2,
        },
        {
          id: 'no-mongodb-from-customer',
          text: 'Must NOT identify MongoDB from the customer_id "mongodb-inc" — this is a customer identifier, not infrastructure',
          score: 2,
        },
        {
          id: 'no-entity-features',
          text: 'Must NOT create any entity features (service, database, cache) from these logs since no real system components are evidenced',
          score: 2,
        },
      ],
      max_features: 1,
      max_confidence: 40,
      forbidden_types: ['entity'],
    },
    metadata: {
      description:
        'Technology names in paths, customer names, and labels - not actual infrastructure',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-03-15T14:30:00.025Z',
          message: 'Starting service in region us-west-2',
          'service.name': 'worker-daemon',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-15T14:30:00.160Z',
          message: 'Storage bucket configured: s3://my-bucket',
          'service.name': 'worker-daemon',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-15T14:30:00.290Z',
          message: 'Instance type: 4 vCPU, 16 GB RAM',
          'service.name': 'worker-daemon',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-03-15T14:30:00.420Z',
          message: 'Error fetching metadata from 169.254.169.254 (timeout)',
          'service.name': 'worker-daemon',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-03-15T14:30:00.550Z',
          message: 'Load balancer health check received',
          'service.name': 'worker-daemon',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-03-15T14:30:00.680Z',
          message: 'Auto-scaling group notification: capacity=5',
          'service.name': 'worker-daemon',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-15T14:30:00.810Z',
          message: 'Database connection string: host=db.internal port=3306 user=app',
          'service.name': 'worker-daemon',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-03-15T14:30:00.940Z',
          message: 'Worker started, polling queue',
          'service.name': 'worker-daemon',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-15T14:30:01.070Z',
          message: 'Job processed in 234ms, result=success',
          'service.name': 'worker-daemon',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-15T14:30:01.200Z',
          message: 'Heartbeat sent to orchestrator',
          'service.name': 'worker-daemon',
          'log.level': 'DEBUG',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'no-aws-from-s3-url',
          text: 'Must NOT confidently identify AWS from s3:// URL alone — S3-compatible storage (MinIO, Ceph) is common on-premises',
          score: 2,
        },
        {
          id: 'no-cloud-from-failed-metadata',
          text: 'Must NOT identify a cloud provider since the metadata endpoint request timed out',
          score: 2,
        },
        {
          id: 'no-db-from-port-only',
          text: 'Must NOT identify a specific database technology from port 3306 alone — could be MySQL, MariaDB, or a database proxy',
          score: 2,
        },
        {
          id: 'inferred-tag-if-emitted',
          text: 'Any features extracted must be tagged as "inferred" with meta.note explaining the ambiguity',
          score: 1,
        },
      ],
      max_features: 2,
      max_confidence: 50,
    },
    metadata: {
      description: 'Cloud-like signals but no definitive provider identification',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-04-08T22:45:00.030Z',
          message: 'Upstream returned HTTP 503 after 30000ms (service unavailable)',
          'service.name': 'ingress-controller',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-04-08T22:45:00.170Z',
          message: 'Circuit breaker OPEN for backend pool "database-cluster"',
          'service.name': 'ingress-controller',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-04-08T22:45:00.310Z',
          message: 'Retrying with exponential backoff: attempt 3, delay 4000ms',
          'service.name': 'ingress-controller',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-08T22:45:00.450Z',
          message: 'SSL certificate expires in 30 days (CN=*.internal.local)',
          'service.name': 'ingress-controller',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-04-08T22:45:00.590Z',
          message: 'Request routed to backend: 10.0.1.100:8080 (round-robin)',
          'service.name': 'ingress-controller',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-04-08T22:45:00.730Z',
          message: 'Header X-Request-ID: abc123 added to upstream request',
          'service.name': 'ingress-controller',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-04-08T22:45:00.870Z',
          message: 'Timeout waiting for upstream response (configured: 30s)',
          'service.name': 'ingress-controller',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-04-08T22:45:01.010Z',
          message: 'Connection drained from pool, current size: 47',
          'service.name': 'ingress-controller',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-04-08T22:45:01.150Z',
          message: 'Health check failed for backend at 10.0.1.101:8080',
          'service.name': 'ingress-controller',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-04-08T22:45:01.290Z',
          message: 'Returning cached response (stale-while-revalidate)',
          'service.name': 'ingress-controller',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'no-db-from-pool-label',
          text: 'Must NOT identify a database from "database-cluster" — this is a routing pool label, not a database technology indicator',
          score: 2,
        },
        {
          id: 'no-proxy-tech',
          text: 'Must NOT identify Nginx, HAProxy, or Envoy — no technology-specific signatures are present in these generic load balancer logs',
          score: 2,
        },
        {
          id: 'no-container-orchestration',
          text: 'Must NOT identify Kubernetes, Docker, or ECS — no container orchestration patterns are present',
          score: 2,
        },
        {
          id: 'no-entity-features',
          text: 'Must NOT create entity features (database, service) from generic routing and circuit breaker patterns',
          score: 2,
        },
      ],
      max_features: 1,
      max_confidence: 40,
      forbidden_types: ['entity'],
    },
    metadata: {
      description: 'Generic proxy/load balancer logs with no specific technology indicators',
    },
  },

  // Edge case: Conflicting signals - database technology appears inconsistent
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-05-20T14:15:00.010Z',
          message: 'connection pool exhausted host=db.internal:5432 retrying...',
          'service.name': 'data-api',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-05-20T14:15:00.140Z',
          message: 'ERROR 1045 (28000): Access denied for user app@db.internal',
          'service.name': 'data-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-05-20T14:15:00.270Z',
          message: 'SQLSTATE[HY000]: General error connecting to db.internal:5432',
          'service.name': 'data-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-05-20T14:15:00.400Z',
          message: 'query timeout after 30s: SELECT * FROM products LIMIT 100',
          'service.name': 'data-api',
          'log.level': 'ERROR',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'restraint-conflicting-db',
          text: 'Must recognize the conflicting evidence: port 5432 suggests PostgreSQL but ERROR 1045 is a MySQL-specific error code',
          score: 2,
        },
        {
          id: 'no-confident-db-entity',
          text: 'Must NOT create a database entity feature with high confidence — the conflicting PostgreSQL/MySQL signals prevent reliable identification',
          score: 3,
        },
        {
          id: 'conflict-noted-in-meta',
          text: 'If any database feature is emitted despite the conflict, it must include meta.note explaining the contradictory PostgreSQL vs MySQL signals',
          score: 2,
        },
      ],
      max_features: 2,
      max_confidence: 50,
    },
    metadata: {
      description: 'Conflicting database signals (PostgreSQL port with MySQL error)',
    },
  },

  // Edge case: Technology name spam - adversarial log
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-05-22T16:20:00.010Z',
          message: 'service starting pid=9284 host=worker-05',
          'service.name': 'task-processor',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-05-22T16:20:00.140Z',
          message:
            'ERROR: missing dependencies - need postgresql mongodb redis elasticsearch cassandra kafka rabbitmq mysql oracle',
          'service.name': 'task-processor',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-05-22T16:20:00.270Z',
          message: 'checking available backends...',
          'service.name': 'task-processor',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-05-22T16:20:00.400Z',
          message: 'FATAL: no supported database found, exiting',
          'service.name': 'task-processor',
          'log.level': 'ERROR',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'zero-features',
          text: 'Must extract exactly zero features — all technology names appear only in the context of missing/unavailable dependencies',
          score: 3,
        },
        {
          id: 'no-entity-from-missing',
          text: 'Must NOT create entity features (database, cache, queue) for technologies listed as missing dependencies',
          score: 2,
        },
        {
          id: 'no-tech-from-error',
          text: 'Must NOT extract technology features from the error listing "need postgresql mongodb redis..." — these are required but absent',
          score: 2,
        },
        {
          id: 'needs-vs-has',
          text: 'Must distinguish between "needs X" (dependency requirement) and "has X" (actual running infrastructure)',
          score: 2,
        },
        {
          id: 'no-dependency-features',
          text: 'Must NOT create dependency features for postgresql, mongodb, redis, elasticsearch, cassandra, kafka, rabbitmq, mysql, or oracle since none of these are actually connected or running',
          score: 2,
        },
      ],
      max_features: 0,
      forbidden_types: ['entity', 'technology', 'dependency'],
    },
    metadata: {
      description: 'Adversarial case: technology names in error about missing dependencies',
    },
  },
];

const FALSE_POSITIVE_EXAMPLES: FeatureIdentificationEvaluationExample[] = [
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-01-15T09:10:00.005Z',
          message: 'Starting web-api v2.1.0 (.NET 8.0.2) on host=web-01',
          'service.name': 'web-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-15T09:10:00.090Z',
          message: 'ASP.NET Core 8 hosting started; listening on http://0.0.0.0:8080',
          'service.name': 'web-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-15T09:10:00.210Z',
          message:
            'SQL Server connected: Microsoft SQL Server 2022 (build 16.0.4105.2) database=orders',
          'service.name': 'web-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-15T09:10:00.330Z',
          message: 'cloud.provider=azure cloud.region=westeurope',
          'service.name': 'web-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-15T09:10:00.480Z',
          message:
            'search_api query="kubernetes redis mongodb tutorial" user_id=u_8472 result_count=0 duration_ms=156',
          'service.name': 'web-api',
          'event.dataset': 'app.search',
        },
        {
          '@timestamp': '2026-01-15T09:10:00.650Z',
          message:
            'docs page rendered: "How to deploy PostgreSQL on Kubernetes" page_id=docs-1472 viewer_id=u_8472',
          'service.name': 'web-api',
          'event.dataset': 'app.docs',
        },
        {
          '@timestamp': '2026-01-15T09:10:00.840Z',
          message:
            'incoming request body: {"preferredCache":"redis","db":"mongodb","ttl":3600} content_type=application/json',
          'service.name': 'web-api',
          'event.dataset': 'app.requests',
        },
        {
          '@timestamp': '2026-01-15T09:10:01.220Z',
          message: 'Calling auth-service at https://auth.internal/oauth/token status=200',
          'service.name': 'web-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-15T09:10:01.650Z',
          message: 'Exception: System.Data.SqlClient.SqlException: Login failed',
          'service.name': 'web-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-01-15T09:10:02.120Z',
          message: 'Feature flag "EnableKubernetesMode" evaluated to false',
          'service.name': 'web-api',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-web-api',
          text: 'Must identify web-api as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-sql-server',
          text: 'Must identify SQL Server as a feature with type "entity" and subtype "database"',
          score: 2,
        },
        {
          id: 'tech-dotnet',
          text: 'Must identify .NET/C# and ASP.NET Core as technology features',
          score: 1,
        },
        {
          id: 'infra-azure',
          text: 'Must identify Azure as an infrastructure feature',
          score: 1,
        },
        {
          id: 'dep-auth-service',
          text: 'Must identify the dependency from web-api to auth-service',
          score: 1,
        },
        {
          id: 'no-tech-from-search-query',
          text: 'Must NOT identify Kubernetes, Redis, or MongoDB from the user search query "kubernetes redis mongodb tutorial"',
          score: 2,
        },
        {
          id: 'no-tech-from-docs-page',
          text: 'Must NOT identify PostgreSQL from the docs page title "How to deploy PostgreSQL on Kubernetes"',
          score: 2,
        },
        {
          id: 'no-tech-from-request-body',
          text: 'Must NOT identify Redis or MongoDB from the JSON request body containing user preferences',
          score: 2,
        },
        {
          id: 'no-k8s-from-feature-flag',
          text: 'Must NOT identify Kubernetes from the feature flag name "EnableKubernetesMode" evaluated to false',
          score: 2,
        },
      ],
      min_features: 3,
      required_types: ['entity', 'technology', 'infrastructure', 'dependency'],
    },
    metadata: {
      description: '.NET/Azure service with misleading tech mentions in user content',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-02-28T11:20:00.015Z',
          message: 'Starting ml-inference v3.0.0 with Python 3.11.7 (tensorflow 2.15.0)',
          'service.name': 'ml-inference',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.150Z',
          message: 'Connected to PostgreSQL 15.5 at ml-db.internal:5432',
          'service.name': 'ml-inference',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.280Z',
          message: 'AWS SageMaker endpoint ready: ml-inference-prod',
          'service.name': 'ml-inference',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.410Z',
          message:
            'model eval: accuracy comparison our_model=0.9412 azure_ml_baseline=0.9087 improvement=+3.25%',
          'service.name': 'ml-inference',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.540Z',
          message:
            'benchmark suite complete: TensorFlow=245ms PyTorch=312ms JAX=198ms test_set=validation',
          'service.name': 'ml-inference',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.670Z',
          message: 'loaded custom weights customer=GCP-Solutions-Inc model_id=m_847219 version=3',
          'service.name': 'ml-inference',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.800Z',
          message:
            'db latency analysis: MySQL_avg=50.2ms current_pg=35.1ms delta=-30.1% sample_size=1000',
          'service.name': 'ml-inference',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.930Z',
          message: 'Fetched model from prediction-service: POST /api/predict -> 200',
          'service.name': 'ml-inference',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.935Z',
          message:
            '[envoy] upstream_rq_completed{cluster=ml-inference,response_code=200} rq_total=1847',
          'service.name': 'envoy-sidecar',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-28T11:20:01.060Z',
          message: 'gunicorn workers: 4, timeout: 120s',
          'service.name': 'ml-inference',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-28T11:20:01.190Z',
          message: 'Ready for inference requests',
          'service.name': 'ml-inference',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-ml-inference',
          text: 'Must identify ml-inference as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-postgres-db',
          text: 'Must identify PostgreSQL as a feature with type "entity" and subtype "database" with version "15.5"',
          score: 2,
        },
        {
          id: 'tech-python',
          text: 'Must identify Python as a technology feature with version "3.11.7"',
          score: 1,
        },
        {
          id: 'tech-tensorflow',
          text: 'Must identify TensorFlow as a technology feature with version "2.15.0" (explicitly loaded at startup)',
          score: 1,
        },
        {
          id: 'infra-aws',
          text: 'Must identify AWS as an infrastructure feature (SageMaker endpoint)',
          score: 1,
        },
        {
          id: 'dep-prediction-service',
          text: 'Must identify the dependency from ml-inference to prediction-service',
          score: 1,
        },
        {
          id: 'no-azure-from-benchmark',
          text: 'Must NOT identify Azure from "azure_ml_baseline" — this is a comparison metric, not actual infrastructure',
          score: 2,
        },
        {
          id: 'no-gcp-from-customer',
          text: 'Must NOT identify GCP from customer name "GCP-Solutions-Inc" — this is a client company name',
          score: 2,
        },
        {
          id: 'no-pytorch-jax-from-benchmark',
          text: 'Must NOT identify PyTorch or JAX from benchmark comparison results — only TensorFlow is actually loaded',
          score: 2,
        },
        {
          id: 'no-mysql-from-latency-analysis',
          text: 'Must NOT identify MySQL from "MySQL_avg=50.2ms" — this is a latency comparison metric, not an actual connection',
          score: 2,
        },
      ],
      min_features: 4,
      required_types: ['entity', 'technology', 'infrastructure', 'dependency'],
    },
    metadata: {
      description: 'Python ML service with competitor products and alternatives mentioned in logs',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-03-22T16:40:00.010Z',
          message: 'Starting api-gateway v1.5.0 built with Go 1.21.6',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-22T16:40:00.140Z',
          message: 'Memcached pool ready: memcached.internal:11211 (server v1.6.22)',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-22T16:40:00.270Z',
          message: 'Oracle Cloud metadata: compartmentId=ocid1.compartment.oc1..aaa tenancy=acme',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-22T16:40:00.400Z',
          message:
            'Error parsing user config: "database": "redis" is not a valid database type. Supported: mysql, postgresql',
          'service.name': 'api-gateway',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-03-22T16:40:00.530Z',
          message: 'Rejecting request: header "X-Database-Type: mongodb" not supported',
          'service.name': 'api-gateway',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-03-22T16:40:00.660Z',
          message: 'Documentation link: https://docs.example.com/postgresql-migration',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-22T16:40:00.790Z',
          message: 'REST call to user-service: GET /api/users/123 -> 200',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-22T16:40:00.920Z',
          message: 'Deprecated: "cassandra" backend will be removed in v2.0',
          'service.name': 'api-gateway',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-03-22T16:40:01.050Z',
          message: 'chi router initialized with 15 routes',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-22T16:40:01.180Z',
          message: 'Server listening on :8080',
          'service.name': 'api-gateway',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-api-gateway',
          text: 'Must identify api-gateway as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-memcached',
          text: 'Must identify Memcached as a feature with type "entity" and subtype "cache" with version "1.6.22"',
          score: 2,
        },
        {
          id: 'tech-go',
          text: 'Must identify Go as a technology feature with version "1.21.6"',
          score: 1,
        },
        {
          id: 'infra-oci',
          text: 'Must identify Oracle Cloud (OCI) as an infrastructure feature',
          score: 1,
        },
        {
          id: 'dep-user-service',
          text: 'Must identify the dependency from api-gateway to user-service',
          score: 1,
        },
        {
          id: 'no-redis-from-config-error',
          text: 'Must NOT identify Redis from the config validation error — "redis" is an invalid user-provided config value',
          score: 2,
        },
        {
          id: 'no-mongodb-from-header',
          text: 'Must NOT identify MongoDB from the rejected HTTP header "X-Database-Type: mongodb"',
          score: 2,
        },
        {
          id: 'no-postgres-from-docs-url',
          text: 'Must NOT identify PostgreSQL from the documentation URL about "postgresql-migration"',
          score: 2,
        },
        {
          id: 'no-cassandra-from-deprecation',
          text: 'Must NOT identify Cassandra from the deprecation warning — "cassandra backend will be removed" is not current infrastructure',
          score: 2,
        },
      ],
      min_features: 3,
      required_types: ['entity', 'technology', 'infrastructure', 'dependency'],
    },
    metadata: {
      description:
        'Go service with tech names in error messages, docs links, and deprecation warnings',
    },
  },

  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-04-15T13:55:00.020Z',
          message: 'Starting report-generator v4.2.0 with OpenJDK 17.0.9 (Corretto)',
          'service.name': 'report-generator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-15T13:55:00.160Z',
          message: 'Quarkus 3.6.0 native build running',
          'service.name': 'report-generator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-15T13:55:00.300Z',
          message: 'CockroachDB connection established: cockroachdb.internal:26257 (v23.2.0)',
          'service.name': 'report-generator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-15T13:55:00.440Z',
          message: 'Alibaba Cloud ECS metadata: region=cn-hangzhou instance-type=ecs.g7.xlarge',
          'service.name': 'report-generator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-15T13:55:00.580Z',
          message: 'Report template: "PostgreSQL to MySQL Migration Guide" (content title)',
          'service.name': 'report-generator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-15T13:55:00.720Z',
          message: 'Competitor analysis: Spring Boot startup=2.5s vs Quarkus=0.8s (benchmark)',
          'service.name': 'report-generator',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-04-15T13:55:00.860Z',
          message: 'Customer "Redis-Labs" report generated (company name)',
          'service.name': 'report-generator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-15T13:55:01.000Z',
          message: 'POST to notification-hub: /api/notify -> 201 (34ms)',
          'service.name': 'report-generator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-15T13:55:01.140Z',
          message: 'Evaluating alternative: MongoDB Atlas vs current CockroachDB (evaluation only)',
          'service.name': 'report-generator',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-04-15T13:55:01.280Z',
          message: 'Report generation complete: 45 pages, 12 charts',
          'service.name': 'report-generator',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-report-generator',
          text: 'Must identify report-generator as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-cockroachdb',
          text: 'Must identify CockroachDB as a feature with type "entity" and subtype "database" with version "23.2.0"',
          score: 2,
        },
        {
          id: 'tech-java',
          text: 'Must identify Java as a technology feature with version "17.0.9"',
          score: 1,
        },
        {
          id: 'tech-quarkus',
          text: 'Must identify Quarkus as a technology feature with version "3.6.0"',
          score: 1,
        },
        {
          id: 'infra-alibabacloud',
          text: 'Must identify Alibaba Cloud as an infrastructure feature',
          score: 1,
        },
        {
          id: 'dep-notification-hub',
          text: 'Must identify the dependency from report-generator to notification-hub',
          score: 1,
        },
        {
          id: 'no-postgres-mysql-from-report',
          text: 'Must NOT identify PostgreSQL or MySQL from the report template title "PostgreSQL to MySQL Migration Guide"',
          score: 2,
        },
        {
          id: 'no-spring-boot-from-benchmark',
          text: 'Must NOT identify Spring Boot from the competitor benchmark comparison',
          score: 2,
        },
        {
          id: 'no-redis-from-customer',
          text: 'Must NOT identify Redis from customer company name "Redis-Labs"',
          score: 2,
        },
        {
          id: 'no-mongodb-from-evaluation',
          text: 'Must NOT identify MongoDB from the evaluation comparison "MongoDB Atlas vs current CockroachDB"',
          score: 2,
        },
      ],
      min_features: 4,
      required_types: ['entity', 'technology', 'infrastructure', 'dependency'],
    },
    metadata: {
      description: 'Java Quarkus service on Alibaba Cloud with competitor comparisons in logs',
    },
  },

  // Edge case: Migration logs mentioning old and new stack
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-06-10T09:00:00.010Z',
          message: 'migration service starting: Python 3.11.2 django=4.2.0',
          'service.name': 'migration-runner',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-10T09:00:00.150Z',
          message: 'connecting to source: MySQL 5.7.38 legacy-db.internal:3306',
          'service.name': 'migration-runner',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-10T09:00:00.290Z',
          message: 'connecting to target: PostgreSQL 15.2 new-db.internal:5432',
          'service.name': 'migration-runner',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-10T09:00:00.430Z',
          message: 'migration plan: MySQL -> PostgreSQL table_count=47 estimated_time=3h',
          'service.name': 'migration-runner',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-10T09:00:00.570Z',
          message: 'migrating table users: MySQL rows=1.2M -> PostgreSQL batch_size=10000',
          'service.name': 'migration-runner',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-10T09:00:00.710Z',
          message: 'progress: 15% complete elapsed=45m eta=4h15m',
          'service.name': 'migration-runner',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-migration-runner',
          text: 'Must identify migration-runner as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'entity-mysql-source',
          text: 'Must identify MySQL as a feature with type "entity" and subtype "database" with version "5.7.38" (source database)',
          score: 2,
        },
        {
          id: 'entity-postgres-target',
          text: 'Must identify PostgreSQL as a separate feature with type "entity" and subtype "database" with version "15.2" (target database)',
          score: 2,
        },
        {
          id: 'two-separate-databases',
          text: 'MySQL and PostgreSQL must be identified as two separate database entity features — not merged into one',
          score: 2,
        },
        {
          id: 'tech-python',
          text: 'Must identify Python as a technology feature with version "3.11.2"',
          score: 1,
        },
        {
          id: 'tech-django',
          text: 'Must identify Django as a technology feature with version "4.2.0"',
          score: 1,
        },
        {
          id: 'source-target-context',
          text: 'Should optionally note source vs target role in meta.role or meta.note to provide migration context',
          score: 1,
        },
      ],
      min_features: 4,
      required_types: ['entity', 'technology'],
    },
    metadata: {
      description: 'Migration tool with both source (MySQL) and target (PostgreSQL) databases',
    },
  },

  // Edge case: Configuration test logs with multiple technologies mentioned
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-06-12T11:00:00.010Z',
          message: 'test suite starting: config validation tests',
          'service.name': 'config-validator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-12T11:00:00.150Z',
          message: 'TEST: validate_redis_config PASSED - redis connection string format valid',
          'service.name': 'config-validator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-12T11:00:00.290Z',
          message: 'TEST: validate_postgres_config PASSED - postgresql dsn format valid',
          'service.name': 'config-validator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-12T11:00:00.430Z',
          message: 'TEST: validate_mongodb_config FAILED - invalid replica set configuration',
          'service.name': 'config-validator',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-06-12T11:00:00.570Z',
          message: 'running on: Go 1.20.5 linux/amd64',
          'service.name': 'config-validator',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-06-12T11:00:00.710Z',
          message: 'test results: 15 passed, 1 failed, 0 skipped',
          'service.name': 'config-validator',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      criteria: [
        {
          id: 'entity-config-validator',
          text: 'Must identify config-validator as a feature with type "entity" and subtype "service"',
          score: 2,
        },
        {
          id: 'tech-go',
          text: 'Must identify Go as a technology feature with version "1.20.5" — this is the actual runtime',
          score: 1,
        },
        {
          id: 'no-redis-from-test',
          text: 'Must NOT identify Redis from the test name "validate_redis_config" — this is testing config format, not actual Redis usage',
          score: 2,
        },
        {
          id: 'no-postgres-from-test',
          text: 'Must NOT identify PostgreSQL from the test name "validate_postgres_config" — config format validation, not a connection',
          score: 2,
        },
        {
          id: 'no-mongodb-from-test',
          text: 'Must NOT identify MongoDB from the test name "validate_mongodb_config" — this is config validation, not infrastructure',
          score: 2,
        },
        {
          id: 'testing-vs-using',
          text: 'Must distinguish between testing configuration formats for infrastructure vs actually using that infrastructure',
          score: 2,
        },
      ],
      min_features: 1,
      max_features: 3,
      required_types: ['entity', 'technology'],
    },
    metadata: {
      description: 'Configuration validator testing various DB configs without actually using them',
    },
  },
];

export const FEATURE_IDENTIFICATION_DATASETS: FeatureIdentificationEvaluationDataset[] = [
  {
    name: 'Features (Obvious evidence)',
    description:
      'Logs with explicit, unambiguous feature evidence (version strings, explicit connections). Tests baseline correctness and grounding.',
    examples: OBVIOUS_EVIDENCE_EXAMPLES,
  },
  {
    name: 'Features (Inference required)',
    description:
      'Logs where features must be inferred from ecosystem signals (tracebacks, client libraries, metadata patterns). Tests inference with appropriate confidence calibration.',
    examples: INFERENCE_REQUIRED_EXAMPLES,
  },
  {
    name: 'Features (Ambiguous evidence)',
    description:
      'Logs with isolated, non-corroborating signals. Correct behavior is restraint (zero or minimal features). Tests precision and discipline.',
    examples: AMBIGUOUS_EVIDENCE_EXAMPLES,
  },
  {
    name: 'Features (False positives)',
    description:
      'Logs containing misleading technology mentions in user content, error messages, comparisons, or labels. Tests precision and content vs. infrastructure separation.',
    examples: FALSE_POSITIVE_EXAMPLES,
  },
];
