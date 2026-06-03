/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Static, hard-coded mock data for the entity-centric lab. Mirrors the rows in
 * the design mockup so the prototype looks plausible without any backend.
 * NOT real data — do not export from the public package.
 */

export interface FakeEntityType {
  readonly id: string;
  readonly name: string;
  readonly generatedBy: 'Elastic' | 'User';
  readonly category: string;
  readonly entitiesCount: string;
  readonly subsetsCount: string;
  readonly lastUpdate: string;
}

/**
 * Seed rows for the "Manage entity types" table.
 *
 * Each row mirrors one of the entity-instance `.type` strings in
 * `entities/fake_entities.ts` — `name` matches the Type-column value
 * shown in the entities list, `category` is a canonical
 * `ENTITY_CATEGORIES` label, and `entitiesCount` matches the actual
 * number of seeded instances. That alignment lets the user click any
 * row here, open the corresponding category nav, and see the same
 * count and the same Type labels in the list. The previous filler
 * values (`'Custom'`, `'Category name'`, `'Storage'`, `'Linux
 * host'`, etc.) were retired because they didn't match any real
 * entity instance.
 *
 * Counts are derived from `NON_KUBERNETES_SPECS` / `KUBERNETES_SUB_SPECS`:
 *   - Hosts cycle `['Bare-metal', 'VM']` over 24 entities with 2
 *     seed `Bare-metal` rows → 13 Bare-metal + 11 VM.
 *   - Databases / Services / Middlewares / LLMs match the
 *     `total` / `typeCycle` of their spec.
 *   - Cloud is fully seeded: 4 of each AWS sub-type.
 *   - Kubernetes sub-types come straight from `KUBERNETES_SUB_SPECS`.
 */
export const FAKE_ENTITY_TYPES: readonly FakeEntityType[] = [
  // ---------- Hosts ----------
  {
    id: 'bare-metal-host',
    name: 'Bare-metal',
    generatedBy: 'Elastic',
    category: 'Hosts',
    entitiesCount: '13',
    subsetsCount: '1',
    lastUpdate: '2026-04-20',
  },
  {
    id: 'vm-host',
    name: 'VM',
    generatedBy: 'Elastic',
    category: 'Hosts',
    entitiesCount: '11',
    subsetsCount: '1',
    lastUpdate: '2026-04-20',
  },
  // ---------- Kubernetes ----------
  {
    id: 'k8s-cluster',
    name: 'K8s cluster',
    generatedBy: 'Elastic',
    category: 'Kubernetes',
    entitiesCount: '2',
    subsetsCount: '3',
    lastUpdate: '2026-04-20',
  },
  {
    id: 'k8s-node',
    name: 'K8s node',
    generatedBy: 'Elastic',
    category: 'Kubernetes',
    entitiesCount: '48',
    subsetsCount: '2',
    lastUpdate: '2026-04-20',
  },
  {
    id: 'k8s-namespace',
    name: 'K8s namespace',
    generatedBy: 'Elastic',
    category: 'Kubernetes',
    entitiesCount: '8',
    subsetsCount: '1',
    lastUpdate: '2026-04-18',
  },
  {
    id: 'k8s-pod',
    name: 'K8s pod',
    generatedBy: 'Elastic',
    category: 'Kubernetes',
    entitiesCount: '597',
    subsetsCount: '1',
    lastUpdate: '2026-04-18',
  },
  {
    id: 'k8s-deployment',
    name: 'K8s deployment',
    generatedBy: 'Elastic',
    category: 'Kubernetes',
    entitiesCount: '96',
    subsetsCount: '1',
    lastUpdate: '2026-04-18',
  },
  {
    id: 'k8s-container',
    name: 'K8s container',
    generatedBy: 'Elastic',
    category: 'Kubernetes',
    entitiesCount: '320',
    subsetsCount: '1',
    lastUpdate: '2026-04-18',
  },
  // ---------- Databases ----------
  {
    id: 'postgres',
    name: 'Postgres',
    generatedBy: 'Elastic',
    category: 'Databases',
    entitiesCount: '3',
    subsetsCount: '1',
    lastUpdate: '2026-04-15',
  },
  // ---------- Services ----------
  {
    id: 'apm-service',
    name: 'APM Service',
    generatedBy: 'Elastic',
    category: 'Services',
    entitiesCount: '12',
    subsetsCount: '4',
    lastUpdate: '2026-03-30',
  },
  // ---------- Cloud ----------
  {
    id: 'aws-region',
    name: 'AWS region',
    generatedBy: 'Elastic',
    category: 'Cloud',
    entitiesCount: '4',
    subsetsCount: '1',
    lastUpdate: '2026-04-02',
  },
  {
    id: 'aws-ec2',
    name: 'AWS EC2 Instance',
    generatedBy: 'User',
    category: 'Cloud',
    entitiesCount: '4',
    subsetsCount: '2',
    lastUpdate: '2026-05-05',
  },
  {
    id: 'aws-lambda',
    name: 'AWS Lambda function',
    generatedBy: 'Elastic',
    category: 'Cloud',
    entitiesCount: '4',
    subsetsCount: '1',
    lastUpdate: '2026-04-12',
  },
  {
    id: 'aws-s3',
    name: 'AWS S3 bucket',
    generatedBy: 'Elastic',
    category: 'Cloud',
    entitiesCount: '4',
    subsetsCount: '1',
    lastUpdate: '2026-04-02',
  },
  // ---------- Middlewares ----------
  {
    id: 'kafka',
    name: 'Kafka',
    generatedBy: 'Elastic',
    category: 'Middlewares',
    entitiesCount: '2',
    subsetsCount: '1',
    lastUpdate: '2026-04-08',
  },
  {
    id: 'rabbitmq',
    name: 'RabbitMQ',
    generatedBy: 'Elastic',
    category: 'Middlewares',
    entitiesCount: '2',
    subsetsCount: '1',
    lastUpdate: '2026-04-08',
  },
  // ---------- LLMs ----------
  {
    id: 'openai',
    name: 'OpenAI',
    generatedBy: 'Elastic',
    category: 'LLMs',
    entitiesCount: '1',
    subsetsCount: '1',
    lastUpdate: '2026-05-01',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    generatedBy: 'Elastic',
    category: 'LLMs',
    entitiesCount: '1',
    subsetsCount: '1',
    lastUpdate: '2026-05-01',
  },
];
