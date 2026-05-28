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

export const FAKE_ENTITY_TYPES: readonly FakeEntityType[] = [
  {
    id: 'k8s-cluster',
    name: 'K8s cluster',
    generatedBy: 'Elastic',
    category: 'Kubernetes',
    entitiesCount: '12',
    subsetsCount: '3',
    lastUpdate: '2026-04-20',
  },
  {
    id: 'k8s-node',
    name: 'K8s node',
    generatedBy: 'Elastic',
    category: 'Kubernetes',
    entitiesCount: '184',
    subsetsCount: '2',
    lastUpdate: '2026-04-20',
  },
  {
    id: 'k8s-pod',
    name: 'K8s pod',
    generatedBy: 'Elastic',
    category: 'Kubernetes',
    entitiesCount: '2,310',
    subsetsCount: '1',
    lastUpdate: '2026-04-18',
  },
  {
    id: 'apm-service',
    name: 'APM Service',
    generatedBy: 'Elastic',
    category: 'Services',
    entitiesCount: '47',
    subsetsCount: '4',
    lastUpdate: '2026-03-30',
  },
  {
    id: 'aws-ec2',
    name: 'AWS EC2 Instance',
    generatedBy: 'User',
    category: 'Custom',
    entitiesCount: '203',
    subsetsCount: '2',
    lastUpdate: '2026-05-05',
  },
  {
    id: 'aws-lambda',
    name: 'AWS Lambda function',
    generatedBy: 'Elastic',
    category: 'Category name',
    entitiesCount: '58',
    subsetsCount: '1',
    lastUpdate: '2026-04-12',
  },
  {
    id: 'aws-s3',
    name: 'AWS S3 bucket',
    generatedBy: 'Elastic',
    category: 'Storage',
    entitiesCount: '92',
    subsetsCount: '1',
    lastUpdate: '2026-04-02',
  },
];
