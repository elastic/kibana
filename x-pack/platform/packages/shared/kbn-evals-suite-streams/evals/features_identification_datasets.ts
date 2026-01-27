/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ExpectedFeature {
  type: string;
  name: string;
  value: Record<string, any>;
  description: string;
  min_confidence?: number;
  tags?: string[];
}

export interface ForbiddenFeature {
  type: string;
  name: string;
  reason: string;
}

export interface FeatureIdentificationEvaluationExample {
  input: {
    sample_documents: Array<Record<string, any>>;
  };
  output: {
    expected_features?: ExpectedFeature[];
    forbidden_features?: ForbiddenFeature[];
    criteria: string[];
    weight?: number;
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
          message: 'Starting checkout-api v4.8.0 using Go go1.22.1 (linux/amd64) commit=9f2c1a7',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.090Z',
          message: 'OS detected: Ubuntu 22.04.3 LTS (Jammy Jellyfish)',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.215Z',
          message:
            'PostgreSQL 16.1 connected (dsn=postgres://checkout-db.internal:5432/checkout sslmode=require)',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.310Z',
          message: 'Redis ready: redis-cache.internal:6379 (server v7.2.5)',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.501Z',
          message: 'cloud metadata discovered',
          'cloud.provider': 'aws',
          'cloud.region': 'us-east-1',
          'service.name': 'checkout-api',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.612Z',
          message:
            'k8s detected: pod=checkout-api-79c64f4c9d-2j9bz namespace=prod node=ip-10-0-1-12',
          'k8s.pod.name': 'checkout-api-79c64f4c9d-2j9bz',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.730Z',
          message:
            'HTTP client -> fraud-service: POST http://fraud-svc.internal:8081/check status=200 duration=32ms',
          'service.name': 'checkout-api',
          'http.method': 'POST',
          'peer.service': 'fraud-service',
        },
        {
          '@timestamp': '2026-01-12T10:00:00.901Z',
          message:
            'HTTPS dependency -> stripe: POST https://api.stripe.com/v1/payment_intents status=200',
          'service.name': 'checkout-api',
          'peer.service': 'stripe',
        },
        {
          '@timestamp': '2026-01-12T10:00:01.140Z',
          message: 'Applied DB migrations with goose v3.18.0',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-12T10:00:01.320Z',
          message: 'Healthcheck /ready returned 200',
          'service.name': 'checkout-api',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'go', version: '1.22.1' },
          description: 'Go programming language runtime',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'postgresql', version: '16.1' },
          description: 'PostgreSQL database',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'cache',
          value: { cache: 'redis', version: '7.2.5' },
          description: 'Redis cache',
          min_confidence: 85,
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'aws' },
          description: 'AWS cloud deployment',
          min_confidence: 90,
        },
        {
          type: 'infrastructure',
          name: 'container_orchestration',
          value: { platform: 'kubernetes' },
          description: 'Kubernetes container orchestration',
          min_confidence: 85,
        },
        {
          type: 'infrastructure',
          name: 'operating_system',
          value: { os: 'ubuntu', version: '22.04.3' },
          description: 'Ubuntu Linux operating system',
          min_confidence: 85,
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'checkout-api', target: 'fraud-service', protocol: 'http' },
          description: 'HTTP dependency to fraud-service',
          min_confidence: 80,
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'checkout-api', target: 'stripe', protocol: 'https' },
          description: 'HTTPS dependency to Stripe API',
          min_confidence: 80,
        },
      ],
      forbidden_features: [],
      criteria: [
        'STRUCTURE: Every feature must include all required fields (type, name, description, value, confidence, evidence, tags, meta).',
        'EVIDENCE GROUNDING: Evidence strings must be verbatim substrings from log messages.',
        'RECALL: Should identify programming language, database, cache, cloud provider, container orchestration, operating system, and service dependencies based on explicit evidence.',
        'VERSION ACCURACY: Versions should be extracted accurately from explicit version strings.',
        'VALUE vs META: High-cardinality data (pod names, hostnames) belongs in meta, not value.',
      ],
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
            'Starting OrderService using Java 21.0.2 with Spring Boot 3.2.1 on order-svc-7d8f9c (CentOS Stream 9)',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.150Z',
          message: 'HikariPool-1 - Starting... MySQL Connector/J 8.2.0 (auto-commit=false)',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.280Z',
          message: 'Connected to MySQL 8.0.35 at mysql-primary.internal:3306 (database=orders)',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.410Z',
          message:
            'Kafka producer initialized: bootstrap.servers=kafka-broker.internal:9092 (Apache Kafka 3.6.1)',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.520Z',
          message: 'GCP metadata: project=acme-prod zone=us-central1-f instance=order-svc-7d8f9c',
          'cloud.provider': 'gcp',
          'cloud.region': 'us-central1',
          'service.name': 'order-service',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.640Z',
          message: 'Registered with Eureka: order-service at 10.128.0.15:8080',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.780Z',
          message: 'Feign client configured for inventory-service at http://inventory.internal:8080',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:00.900Z',
          message:
            'REST call to inventory-service: GET /api/stock?sku=ABC123 -> 200 (45ms)',
          'service.name': 'order-service',
          'peer.service': 'inventory-service',
          'http.method': 'GET',
        },
        {
          '@timestamp': '2026-02-05T14:30:01.020Z',
          message: 'Tomcat started on port 8080 (http) with context path ""',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-05T14:30:01.150Z',
          message: 'Application ready in 2.14s (JVM running for 3.01s)',
          'service.name': 'order-service',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'java', version: '21.0.2' },
          description: 'Java programming language',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'web_framework',
          value: { framework: 'spring_boot', version: '3.2.1' },
          description: 'Spring Boot framework',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'mysql', version: '8.0.35' },
          description: 'MySQL database',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'message_queue',
          value: { queue: 'kafka', version: '3.6.1' },
          description: 'Apache Kafka message queue',
          min_confidence: 85,
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'gcp' },
          description: 'Google Cloud Platform deployment',
          min_confidence: 90,
        },
        {
          type: 'infrastructure',
          name: 'operating_system',
          value: { os: 'centos', version: '9' },
          description: 'CentOS Stream operating system',
          min_confidence: 85,
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'order-service', target: 'inventory-service', protocol: 'http' },
          description: 'HTTP dependency to inventory-service',
          min_confidence: 80,
        },
      ],
      forbidden_features: [],
      criteria: [
        'STRUCTURE: Every feature must include all required fields (type, name, description, value, confidence, evidence, tags, meta).',
        'EVIDENCE GROUNDING: Evidence strings must be verbatim substrings from log messages.',
        'RECALL: Should identify Java runtime, Spring Boot framework, MySQL database, Kafka message queue, GCP cloud, and service dependencies.',
        'VERSION ACCURACY: Versions should be extracted accurately from explicit startup logs.',
        'VALUE vs META: High-cardinality data (instance names, IPs) belongs in meta, not value.',
      ],
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
          message: 'telemetry-collector v1.2.0 starting (rustc 1.75.0, target: x86_64-unknown-linux-gnu)',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.120Z',
          message: 'Debian GNU/Linux 12 (bookworm) detected via /etc/os-release',
          'service.name': 'telemetry-collector',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.250Z',
          message:
            'MongoDB driver connected: mongodb://telemetry-mongo.internal:27017 (server version 7.0.4)',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.380Z',
          message: 'NATS connection established: nats://nats.internal:4222 (NATS Server v2.10.7)',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.490Z',
          message: 'Azure metadata: subscriptionId=abc123 location=westus2 vmId=vm-telemetry-01',
          'cloud.provider': 'azure',
          'cloud.region': 'westus2',
          'service.name': 'telemetry-collector',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.600Z',
          message: 'Prometheus metrics endpoint listening on 0.0.0.0:9090/metrics',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.710Z',
          message: 'gRPC server started on [::]:50051',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.830Z',
          message:
            'Upstream call to metrics-aggregator: gRPC /telemetry.Metrics/Push -> OK (12ms)',
          'service.name': 'telemetry-collector',
          'peer.service': 'metrics-aggregator',
        },
        {
          '@timestamp': '2026-03-18T08:45:00.940Z',
          message: 'Tokio runtime initialized with 4 worker threads',
          'service.name': 'telemetry-collector',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-03-18T08:45:01.050Z',
          message: 'Service ready, accepting connections',
          'service.name': 'telemetry-collector',
          'log.level': 'INFO',
        },
      ],
    },
    output: {
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'rust', version: '1.75.0' },
          description: 'Rust programming language',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'mongodb', version: '7.0.4' },
          description: 'MongoDB database',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'message_queue',
          value: { queue: 'nats', version: '2.10.7' },
          description: 'NATS messaging system',
          min_confidence: 85,
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'azure' },
          description: 'Azure cloud deployment',
          min_confidence: 90,
        },
        {
          type: 'infrastructure',
          name: 'operating_system',
          value: { os: 'debian', version: '12' },
          description: 'Debian Linux operating system',
          min_confidence: 85,
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'telemetry-collector', target: 'metrics-aggregator', protocol: 'grpc' },
          description: 'gRPC dependency to metrics-aggregator',
          min_confidence: 80,
        },
      ],
      forbidden_features: [],
      criteria: [
        'STRUCTURE: Every feature must include all required fields (type, name, description, value, confidence, evidence, tags, meta).',
        'EVIDENCE GROUNDING: Evidence strings must be verbatim substrings from log messages.',
        'RECALL: Should identify Rust language, MongoDB database, NATS messaging, Azure cloud, Debian OS, and gRPC dependencies.',
        'VERSION ACCURACY: Versions should be extracted from explicit rustc and server version strings.',
        'VALUE vs META: High-cardinality data (subscription IDs, VM IDs) belongs in meta, not value.',
      ],
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
          message: 'search-api starting with Node.js v20.11.0 (V8 11.3.244.8)',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.140Z',
          message: 'Express 4.18.2 initialized with compression and helmet middleware',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.270Z',
          message: 'Elasticsearch client connected: https://es-cluster.internal:9200 (version 8.12.0)',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.400Z',
          message: 'Redis Cluster connected: redis-cluster.internal:6379,6380,6381 (v7.0.12)',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.510Z',
          message: 'Host OS: Red Hat Enterprise Linux 8.9 (kernel 4.18.0-513)',
          'service.name': 'search-api',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.620Z',
          message: 'No cloud metadata found - assuming on-premises deployment',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.730Z',
          message: 'HTTP call to recommendation-engine: POST /api/recommend -> 200 (89ms)',
          'service.name': 'search-api',
          'peer.service': 'recommendation-engine',
          'http.method': 'POST',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.840Z',
          message: 'Server listening on port 3000',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:00.950Z',
          message: 'Loaded 12 search indices with 2.4M documents total',
          'service.name': 'search-api',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-22T16:15:01.060Z',
          message: 'Health check endpoint registered at /health',
          'service.name': 'search-api',
          'log.level': 'DEBUG',
        },
      ],
    },
    output: {
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'nodejs', version: '20.11.0' },
          description: 'Node.js runtime',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'web_framework',
          value: { framework: 'express', version: '4.18.2' },
          description: 'Express.js web framework',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'search_engine',
          value: { engine: 'elasticsearch', version: '8.12.0' },
          description: 'Elasticsearch search engine',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'cache',
          value: { cache: 'redis', version: '7.0.12' },
          description: 'Redis cache cluster',
          min_confidence: 85,
        },
        {
          type: 'infrastructure',
          name: 'operating_system',
          value: { os: 'rhel', version: '8.9' },
          description: 'Red Hat Enterprise Linux',
          min_confidence: 85,
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'search-api', target: 'recommendation-engine', protocol: 'http' },
          description: 'HTTP dependency to recommendation-engine',
          min_confidence: 80,
        },
      ],
      forbidden_features: [],
      criteria: [
        'STRUCTURE: Every feature must include all required fields (type, name, description, value, confidence, evidence, tags, meta).',
        'EVIDENCE GROUNDING: Evidence strings must be verbatim substrings from log messages.',
        'RECALL: Should identify Node.js runtime, Express framework, Elasticsearch, Redis cache, RHEL OS, and HTTP dependencies.',
        'VERSION ACCURACY: Versions should be extracted from explicit version strings in startup logs.',
        'NO CLOUD: Should NOT extract any cloud provider since logs indicate on-premises deployment.',
      ],
    },
    metadata: {
      description: 'Node.js Express service on-prem with Elasticsearch and Redis cluster',
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
            "Traceback (most recent call last): File \"/app/worker.py\", line 88, in run\n  import pandas as pd\nModuleNotFoundError: No module named 'pandas'",
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
          message:
            'psycopg2.OperationalError: could not translate host name "orders-db.internal"',
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
          'peer.service': 'inventory-service',
          'http.method': 'GET',
        },
      ],
    },
    output: {
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'python' },
          description: 'Python (inferred from tracebacks and pip)',
          min_confidence: 60,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'postgresql' },
          description: 'PostgreSQL (inferred from psycopg2 + SQLSTATE)',
          min_confidence: 55,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'cache',
          value: { cache: 'redis' },
          description: 'Redis (inferred from Jedis client)',
          min_confidence: 55,
          tags: ['inferred'],
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'gcp' },
          description: 'GCP (inferred from metadata server)',
          min_confidence: 60,
          tags: ['inferred'],
        },
        {
          type: 'infrastructure',
          name: 'container_orchestration',
          value: { platform: 'kubernetes' },
          description: 'Kubernetes (inferred from kube-probe + serviceaccount)',
          min_confidence: 60,
          tags: ['inferred'],
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'etl-worker', target: 'inventory-service', protocol: 'https' },
          description: 'HTTPS dependency to inventory-service',
          min_confidence: 70,
        },
      ],
      forbidden_features: [],
      criteria: [
        'STRUCTURE: Every feature must include all required fields (type, name, description, value, confidence, evidence, tags, meta).',
        'INFERENCE TAGGING: Inferred features must include "inferred" tag and explain reasoning in meta.notes.',
        'CONFIDENCE CALIBRATION: Inferred features should have moderate confidence (30-75), not 90+.',
        'NO VERSION FABRICATION: Must NOT invent versions when none are explicit in logs.',
        'RECALL: Should identify Python, PostgreSQL, Redis, GCP, Kubernetes through inference from client libraries and patterns.',
      ],
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
          message: 'ActiveRecord::ConnectionNotEstablished: connection to server at "pg.internal" (10.0.1.50), port 5432 failed',
          'service.name': 'user-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-02-14T11:30:00.370Z',
          message: 'Sidekiq client pushing job UserSyncJob to redis://sidekiq-redis.internal:6379/0',
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
          message: 'Faraday::ConnectionFailed calling notification-api at https://notify.internal/send',
          'service.name': 'user-api',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-02-14T11:30:00.920Z',
          message: 'Rack middleware stack loaded: Rack::Runtime, Rack::MethodOverride, ActionDispatch::...',
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
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'ruby' },
          description: 'Ruby (inferred from NoMethodError, .rb files, bundler)',
          min_confidence: 55,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'web_framework',
          value: { framework: 'rails' },
          description: 'Ruby on Rails (inferred from ActiveRecord, ActionMailer, ActionDispatch)',
          min_confidence: 55,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'postgresql' },
          description: 'PostgreSQL (inferred from ActiveRecord connection + port 5432)',
          min_confidence: 50,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'cache',
          value: { cache: 'redis' },
          description: 'Redis (inferred from Sidekiq connection)',
          min_confidence: 55,
          tags: ['inferred'],
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'aws' },
          description: 'AWS (inferred from aws-sdk IMDS + ECS metadata)',
          min_confidence: 60,
          tags: ['inferred'],
        },
        {
          type: 'infrastructure',
          name: 'container_orchestration',
          value: { platform: 'ecs' },
          description: 'ECS (inferred from task metadata endpoint)',
          min_confidence: 55,
          tags: ['inferred'],
        },
      ],
      forbidden_features: [],
      criteria: [
        'STRUCTURE: Every feature must include all required fields (type, name, description, value, confidence, evidence, tags, meta).',
        'INFERENCE TAGGING: Inferred features must include "inferred" tag and explain reasoning in meta.notes.',
        'CONFIDENCE CALIBRATION: Inferred features should have moderate confidence (30-75), not 90+.',
        'RECALL: Should identify Ruby, Rails framework, PostgreSQL, Redis, AWS, and ECS through inference.',
        'FRAMEWORK RECOGNITION: Should recognize Rails from ActiveRecord, ActionMailer, Rack middleware patterns.',
      ],
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
          message: 'Predis\\Connection\\ConnectionException: Connection refused [tcp://redis.internal:6379]',
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
          message: 'GuzzleHttp\\Exception\\ConnectException calling pricing-service at http://pricing.internal/api/v1/prices',
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
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'php' },
          description: 'PHP (inferred from Fatal error, PDO, php-fpm)',
          min_confidence: 60,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'web_framework',
          value: { framework: 'laravel' },
          description: 'Laravel (inferred from composer.lock, artisan)',
          min_confidence: 55,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'mariadb' },
          description: 'MariaDB (inferred from PDO connection + hostname)',
          min_confidence: 50,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'cache',
          value: { cache: 'redis' },
          description: 'Redis (inferred from Predis client)',
          min_confidence: 55,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'web_server',
          value: { server: 'nginx', version: '1.24.0' },
          description: 'Nginx web server',
          min_confidence: 80,
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'digitalocean' },
          description: 'DigitalOcean (inferred from Spaces SDK + Droplet metadata)',
          min_confidence: 60,
          tags: ['inferred'],
        },
      ],
      forbidden_features: [],
      criteria: [
        'STRUCTURE: Every feature must include all required fields (type, name, description, value, confidence, evidence, tags, meta).',
        'INFERENCE TAGGING: Inferred features must include "inferred" tag and explain reasoning in meta.notes.',
        'CONFIDENCE CALIBRATION: Inferred features should have moderate confidence (30-75), not 90+.',
        'RECALL: Should identify PHP, Laravel, MariaDB, Redis, Nginx, and DigitalOcean through inference.',
        'EXPLICIT VERSION OK: Nginx version is explicit (1.24.0) so can have higher confidence.',
      ],
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
          message:
            'akka.actor.ActorSystem[analytics-system] starting with 8 dispatcher threads',
          'service.name': 'analytics-engine',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-04-12T15:20:00.410Z',
          message: 'slick.jdbc.JdbcBackend: connecting to jdbc:postgresql://analytics-db.internal:5432/analytics',
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
          message:
            'IBM Cloud metadata: region=us-south zone=dal10 instance=analytics-vsi-01',
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
          'peer.service': 'reporting-service',
        },
        {
          '@timestamp': '2026-04-12T15:20:01.090Z',
          message: 'JVM heap: 4096MB max, 2048MB used',
          'service.name': 'analytics-engine',
          'log.level': 'DEBUG',
        },
      ],
    },
    output: {
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'scala', version: '3.3.1' },
          description: 'Scala (inferred from .scala stack traces + sbt)',
          min_confidence: 65,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'postgresql' },
          description: 'PostgreSQL (inferred from Slick JDBC URL)',
          min_confidence: 60,
          tags: ['inferred'],
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'cassandra', version: '4.1.3' },
          description: 'Cassandra database',
          min_confidence: 80,
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'ibm' },
          description: 'IBM Cloud (inferred from metadata)',
          min_confidence: 60,
          tags: ['inferred'],
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'analytics-engine', target: 'reporting-service', protocol: 'https' },
          description: 'HTTPS dependency to reporting-service',
          min_confidence: 75,
        },
      ],
      forbidden_features: [],
      criteria: [
        'STRUCTURE: Every feature must include all required fields (type, name, description, value, confidence, evidence, tags, meta).',
        'INFERENCE TAGGING: Inferred features (Scala, PostgreSQL, IBM Cloud) must include "inferred" tag.',
        'CONFIDENCE CALIBRATION: Inferred features should have moderate confidence. Cassandra has explicit version so can be higher.',
        'RECALL: Should identify Scala, PostgreSQL, Cassandra, IBM Cloud through inference and explicit evidence.',
        'SCALA vs JAVA: Should identify Scala specifically (from .scala files, sbt), not just Java.',
      ],
    },
    metadata: {
      description: 'Scala/Akka service on IBM Cloud with Cassandra and Spark',
    },
  },
];

const AMBIGUOUS_EVIDENCE_EXAMPLES: FeatureIdentificationEvaluationExample[] = [
  {
    input: {
      sample_documents: [
        {
          '@timestamp': '2026-01-14T18:00:00.010Z',
          message: 'Connection timeout on port 9042 after 5000ms',
          'service.name': 'edge-gateway',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-01-14T18:00:00.340Z',
          message: 'Request failed with code E11000',
          'service.name': 'edge-gateway',
          'log.level': 'WARN',
        },
        {
          '@timestamp': '2026-01-14T18:00:00.690Z',
          message: 'Cache lookup took 180ms key="user:123" (slow)',
          'service.name': 'edge-gateway',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-01-14T18:00:01.020Z',
          message: 'Item expired from temporary store (ttl: 300s)',
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
      expected_features: [],
      forbidden_features: [
        { type: 'technology', name: 'database', reason: 'Port-only hints (9042, 5432) are insufficient without driver/protocol evidence' },
        { type: 'technology', name: 'cache', reason: 'Generic "cache" and "ttl" mentions do not identify specific technology' },
        { type: 'technology', name: 'programming_language', reason: 'Single error tokens from different languages do not corroborate any single runtime' },
      ],
      criteria: [
        'RESTRAINT: Should output zero or minimal features. All signals are isolated and non-corroborating.',
        'PORT DISCIPLINE: Must NOT identify database vendors from port numbers alone (9042, 5432).',
        'KEYWORD DISCIPLINE: Must NOT identify cache vendors from generic "cache" or "ttl" mentions.',
        'LANGUAGE DISCIPLINE: Must NOT claim a language when error tokens from multiple languages appear without corroboration.',
        'NO FABRICATION: If any feature is emitted, evidence must still be verbatim from logs.',
      ],
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
          message: 'Request received path=/api/redis/status method=GET',
          'service.name': 'api-proxy',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.150Z',
          message: 'Checking health of upstream postgres-primary (URL: http://health.internal/pg)',
          'service.name': 'api-proxy',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.280Z',
          message: 'Connection pool size: 10 max, 3 active, 7 idle',
          'service.name': 'api-proxy',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.410Z',
          message: 'Rate limiter: 1000 requests/minute allowed',
          'service.name': 'api-proxy',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-20T10:15:00.540Z',
          message: 'Processing request for customer=mongodb-inc (company name)',
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
      expected_features: [],
      forbidden_features: [
        { type: 'technology', name: 'cache', reason: '"redis" appears only in URL path, not as actual tech' },
        { type: 'technology', name: 'database', reason: '"postgres" and "mongodb" appear in names/labels only' },
      ],
      criteria: [
        'RESTRAINT: Should output zero or minimal features. Tech names appear only in paths and labels.',
        'CONTENT vs INFRA: Must distinguish tech names in URL paths (/api/redis/status) from actual infrastructure.',
        'LABEL AWARENESS: Must NOT extract tech from upstream names (postgres-primary) or customer names (mongodb-inc).',
        'NO FABRICATION: If any feature is emitted, evidence must still be verbatim from logs.',
      ],
    },
    metadata: {
      description: 'Technology names in paths, customer names, and labels - not actual infrastructure',
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
          message: 'Storage bucket configured: s3://my-bucket (could be MinIO or AWS)',
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
      expected_features: [],
      forbidden_features: [
        { type: 'infrastructure', name: 'cloud_deployment', reason: 'Region names and s3:// URLs could be MinIO, Ceph, or on-prem; metadata fetch failed' },
        { type: 'technology', name: 'database', reason: 'Port 3306 without driver/version could be MySQL, MariaDB, or a proxy' },
      ],
      criteria: [
        'RESTRAINT: Should output zero or minimal features. Cloud signals are ambiguous.',
        'CLOUD AMBIGUITY: s3:// URLs could be MinIO or Ceph; region names are used by multiple providers.',
        'METADATA FAILURE: Metadata fetch timeout means cloud provider cannot be confirmed.',
        'PORT AMBIGUITY: Port 3306 alone cannot distinguish MySQL vs MariaDB vs proxy.',
        'NO FABRICATION: If any feature is emitted, evidence must still be verbatim from logs.',
      ],
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
      expected_features: [],
      forbidden_features: [
        { type: 'technology', name: 'database', reason: '"database-cluster" is a pool name, not technology identification' },
        { type: 'technology', name: 'web_server', reason: 'No specific server (nginx, envoy, haproxy) is identified' },
        { type: 'infrastructure', name: 'container_orchestration', reason: 'No K8s/Docker/ECS-specific signals present' },
      ],
      criteria: [
        'RESTRAINT: Should output zero or minimal features. Logs show generic proxy behavior.',
        'POOL NAME AWARENESS: "database-cluster" is a backend pool name, not a database technology.',
        'NO SERVER INFERENCE: Generic proxy patterns do not identify specific server software.',
        'NO ORCHESTRATION: No K8s, Docker, or ECS-specific signals are present.',
        'NO FABRICATION: If any feature is emitted, evidence must still be verbatim from logs.',
      ],
    },
    metadata: {
      description: 'Generic proxy/load balancer logs with no specific technology indicators',
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
          'cloud.provider': 'azure',
          'service.name': 'web-api',
        },
        {
          '@timestamp': '2026-01-15T09:10:00.480Z',
          message:
            'User search query: "kubernetes redis mongodb tutorial" results=0',
          'service.name': 'web-api',
          'event.dataset': 'app.search',
        },
        {
          '@timestamp': '2026-01-15T09:10:00.650Z',
          message:
            'Rendered help page "How to deploy PostgreSQL on Kubernetes"',
          'service.name': 'web-api',
          'event.dataset': 'app.docs',
        },
        {
          '@timestamp': '2026-01-15T09:10:00.840Z',
          message:
            'Client payload: {"preferredCache":"redis","db":"mongodb"}',
          'service.name': 'web-api',
          'event.dataset': 'app.requests',
        },
        {
          '@timestamp': '2026-01-15T09:10:01.220Z',
          message:
            'Calling auth-service at https://auth.internal/oauth/token status=200',
          'service.name': 'web-api',
          'peer.service': 'auth-service',
        },
        {
          '@timestamp': '2026-01-15T09:10:01.650Z',
          message:
            'Exception: System.Data.SqlClient.SqlException: Login failed',
          'service.name': 'web-api',
          'log.level': 'ERROR',
        },
        {
          '@timestamp': '2026-01-15T09:10:02.120Z',
          message:
            'Feature flag "EnableKubernetesMode" evaluated to false',
          'service.name': 'web-api',
        },
      ],
    },
    output: {
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'csharp', runtime: 'dotnet', version: '8.0.2' },
          description: '.NET 8.0.2 / C# runtime',
          min_confidence: 85,
        },
        {
          type: 'technology',
          name: 'web_framework',
          value: { framework: 'aspnet_core', version: '8' },
          description: 'ASP.NET Core framework',
          min_confidence: 85,
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'sqlserver', version: '16.0.4105.2' },
          description: 'Microsoft SQL Server',
          min_confidence: 85,
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'azure' },
          description: 'Azure cloud deployment',
          min_confidence: 90,
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'web-api', target: 'auth-service', protocol: 'https' },
          description: 'HTTPS dependency to auth-service',
          min_confidence: 80,
        },
      ],
      forbidden_features: [
        { type: 'technology', name: 'cache', reason: '"redis" only appears in user query and client payload' },
        { type: 'technology', name: 'database', reason: '"mongodb" and "postgresql" only in user content' },
        { type: 'infrastructure', name: 'container_orchestration', reason: '"kubernetes" only in docs content and feature flag name' },
      ],
      criteria: [
        'RECALL: Must extract real stack: .NET/C#, ASP.NET Core, SQL Server, Azure, and auth-service dependency.',
        'FALSE POSITIVE PREVENTION: Must NOT extract redis, mongodb, postgresql, or kubernetes from user content.',
        'CONTENT AWARENESS: User search queries, help pages, and client payloads contain text, not infrastructure.',
        'FEATURE FLAG NAMES: "EnableKubernetesMode" is a config key name, not actual K8s deployment.',
        'EVIDENCE GROUNDING: Evidence must be from infrastructure logs, not user-generated content.',
      ],
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
          'cloud.provider': 'aws',
          'service.name': 'ml-inference',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.410Z',
          message: 'Comparing model accuracy vs Azure ML baseline: our_model=0.94 azure_ml=0.91',
          'service.name': 'ml-inference',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.540Z',
          message: 'Benchmark results: TensorFlow vs PyTorch vs JAX (internal testing)',
          'service.name': 'ml-inference',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.670Z',
          message: 'Customer "GCP-Solutions-Inc" model loaded (customer name only)',
          'service.name': 'ml-inference',
          'log.level': 'INFO',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.800Z',
          message: 'Alternative database comparison: MySQL latency=50ms vs current=35ms',
          'service.name': 'ml-inference',
          'log.level': 'DEBUG',
        },
        {
          '@timestamp': '2026-02-28T11:20:00.930Z',
          message: 'Fetched model from prediction-service: POST /api/predict -> 200',
          'service.name': 'ml-inference',
          'peer.service': 'prediction-service',
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
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'python', version: '3.11.7' },
          description: 'Python runtime',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'ml_framework',
          value: { framework: 'tensorflow', version: '2.15.0' },
          description: 'TensorFlow ML framework',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'postgresql', version: '15.5' },
          description: 'PostgreSQL database',
          min_confidence: 90,
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'aws' },
          description: 'AWS cloud deployment',
          min_confidence: 90,
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'ml-inference', target: 'prediction-service', protocol: 'http' },
          description: 'HTTP dependency to prediction-service',
          min_confidence: 80,
        },
      ],
      forbidden_features: [
        { type: 'infrastructure', name: 'cloud_deployment', reason: '"Azure ML" and "GCP" are competitor/customer names, not deployment' },
        { type: 'technology', name: 'ml_framework', reason: '"PyTorch" and "JAX" mentioned only in benchmark comparison' },
        { type: 'technology', name: 'database', reason: '"MySQL" mentioned only in latency comparison' },
      ],
      criteria: [
        'RECALL: Must extract real stack: Python, TensorFlow, PostgreSQL, AWS, and prediction-service dependency.',
        'FALSE POSITIVE PREVENTION: Must NOT extract Azure, GCP, PyTorch, JAX, or MySQL from comparisons.',
        'COMPETITOR AWARENESS: "Azure ML baseline" and "GCP-Solutions-Inc" are competitor/customer references.',
        'BENCHMARK AWARENESS: "TensorFlow vs PyTorch vs JAX" is a comparison, not actual frameworks in use.',
        'EVIDENCE GROUNDING: Evidence must be from actual infrastructure, not benchmarks or comparisons.',
      ],
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
          'cloud.provider': 'oci',
          'service.name': 'api-gateway',
        },
        {
          '@timestamp': '2026-03-22T16:40:00.400Z',
          message: 'Error parsing user config: "database": "redis" is not a valid database type. Supported: mysql, postgresql',
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
          'peer.service': 'user-service',
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
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'go', version: '1.21.6' },
          description: 'Go programming language',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'cache',
          value: { cache: 'memcached', version: '1.6.22' },
          description: 'Memcached cache server',
          min_confidence: 85,
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'oci' },
          description: 'Oracle Cloud Infrastructure',
          min_confidence: 90,
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'api-gateway', target: 'user-service', protocol: 'http' },
          description: 'HTTP dependency to user-service',
          min_confidence: 80,
        },
      ],
      forbidden_features: [
        { type: 'technology', name: 'cache', reason: '"redis" only in error message about invalid config' },
        { type: 'technology', name: 'database', reason: '"mongodb", "postgresql", "cassandra" in errors, docs, or deprecation notices' },
      ],
      criteria: [
        'RECALL: Must extract real stack: Go, Memcached, Oracle Cloud (OCI), and user-service dependency.',
        'FALSE POSITIVE PREVENTION: Must NOT extract redis, mongodb, postgresql, or cassandra.',
        'ERROR MESSAGE AWARENESS: "database: redis is not valid" shows redis in error context, not actual tech.',
        'HEADER/DOC AWARENESS: X-Database-Type header and docs URLs mention tech but are not infrastructure.',
        'DEPRECATION AWARENESS: "cassandra backend will be removed" is a notice about future removal.',
      ],
    },
    metadata: {
      description: 'Go service with tech names in error messages, docs links, and deprecation warnings',
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
          'cloud.provider': 'alibabacloud',
          'service.name': 'report-generator',
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
          'peer.service': 'notification-hub',
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
      expected_features: [
        {
          type: 'technology',
          name: 'programming_language',
          value: { language: 'java', version: '17.0.9' },
          description: 'Java (OpenJDK Corretto)',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'web_framework',
          value: { framework: 'quarkus', version: '3.6.0' },
          description: 'Quarkus framework',
          min_confidence: 90,
        },
        {
          type: 'technology',
          name: 'database',
          value: { database: 'cockroachdb', version: '23.2.0' },
          description: 'CockroachDB database',
          min_confidence: 90,
        },
        {
          type: 'infrastructure',
          name: 'cloud_deployment',
          value: { provider: 'alibabacloud' },
          description: 'Alibaba Cloud deployment',
          min_confidence: 90,
        },
        {
          type: 'dependency',
          name: 'service_dependency',
          value: { source: 'report-generator', target: 'notification-hub', protocol: 'http' },
          description: 'HTTP dependency to notification-hub',
          min_confidence: 80,
        },
      ],
      forbidden_features: [
        { type: 'technology', name: 'web_framework', reason: '"Spring Boot" only in benchmark comparison' },
        { type: 'technology', name: 'database', reason: '"PostgreSQL", "MySQL", "MongoDB" only in report titles and evaluations' },
        { type: 'technology', name: 'cache', reason: '"Redis-Labs" is a customer company name' },
      ],
      criteria: [
        'RECALL: Must extract real stack: Java, Quarkus, CockroachDB, Alibaba Cloud, and notification-hub dependency.',
        'FALSE POSITIVE PREVENTION: Must NOT extract Spring Boot, PostgreSQL, MySQL, MongoDB, or Redis.',
        'BENCHMARK AWARENESS: "Spring Boot startup=2.5s vs Quarkus=0.8s" is a comparison, not actual tech.',
        'REPORT CONTENT AWARENESS: "PostgreSQL to MySQL Migration Guide" is a report title, not infrastructure.',
        'CUSTOMER NAME AWARENESS: "Redis-Labs" is a company name, not cache technology.',
      ],
    },
    metadata: {
      description: 'Java Quarkus service on Alibaba Cloud with competitor comparisons in logs',
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
