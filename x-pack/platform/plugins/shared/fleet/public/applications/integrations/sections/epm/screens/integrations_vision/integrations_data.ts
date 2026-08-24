/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Design-prototype-only mock data — a small, representative slice of the
// real integrations catalog, just enough to demonstrate the browsing
// experience (categorization, search, install state) without wiring up
// the actual package registry.

export interface VisionIntegration {
  id: string;
  name: string;
  description: string;
  iconType: string;
  categoryIds: string[];
  isInstalled?: boolean;
}

export interface VisionCategory {
  id: string;
  label: string;
}

export const VISION_CATEGORIES: VisionCategory[] = [
  { id: 'cloud', label: 'Cloud' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'observability', label: 'Observability' },
  { id: 'security', label: 'Security' },
  { id: 'application', label: 'Application' },
  { id: 'custom', label: 'Custom' },
];

export const VISION_INTEGRATIONS: VisionIntegration[] = [
  {
    id: 'aws',
    name: 'AWS',
    description: 'Collect logs and metrics from Amazon Web Services.',
    iconType: 'logoAWS',
    categoryIds: ['cloud', 'infrastructure'],
    isInstalled: true,
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    description: 'Collect logs and metrics from GCP services.',
    iconType: 'logoGCP',
    categoryIds: ['cloud', 'infrastructure'],
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    description: 'Collect logs and metrics from Azure services.',
    iconType: 'logoAzure',
    categoryIds: ['cloud', 'infrastructure'],
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    description: 'Monitor Kubernetes clusters, pods, and workloads.',
    iconType: 'logoKubernetes',
    categoryIds: ['infrastructure', 'observability'],
    isInstalled: true,
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Collect container logs and performance metrics.',
    iconType: 'logoDocker',
    categoryIds: ['infrastructure'],
  },
  {
    id: 'nginx',
    name: 'Nginx',
    description: 'Collect access, error, and status logs from Nginx.',
    iconType: 'logoNginx',
    categoryIds: ['application', 'infrastructure'],
  },
  {
    id: 'apache',
    name: 'Apache',
    description: 'Collect access and error logs from Apache HTTP Server.',
    iconType: 'logoApache',
    categoryIds: ['application', 'infrastructure'],
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Collect error, slow, and general logs from MySQL.',
    iconType: 'logoMySQL',
    categoryIds: ['application'],
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Collect logs and query performance metrics from PostgreSQL.',
    iconType: 'logoPostgres',
    categoryIds: ['application'],
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'Collect logs and metrics from Redis instances.',
    iconType: 'logoRedis',
    categoryIds: ['application'],
  },
  {
    id: 'apm',
    name: 'Elastic APM',
    description: 'Collect distributed traces from your applications.',
    iconType: 'apmApp',
    categoryIds: ['observability', 'application'],
    isInstalled: true,
  },
  {
    id: 'synthetics',
    name: 'Elastic Synthetics',
    description: 'Monitor uptime and user journeys from the outside in.',
    iconType: 'uptimeApp',
    categoryIds: ['observability'],
  },
  {
    id: 'okta',
    name: 'Okta',
    description: 'Collect authentication and audit logs from Okta.',
    iconType: 'lock',
    categoryIds: ['security'],
  },
  {
    id: 'crowdstrike',
    name: 'CrowdStrike',
    description: 'Ingest endpoint detection and response data.',
    iconType: 'securityApp',
    categoryIds: ['security'],
  },
  {
    id: 'custom_logs',
    name: 'Custom Logs',
    description: 'Collect logs from any file on your filesystem.',
    iconType: 'documents',
    categoryIds: ['custom'],
  },
  {
    id: 'httpjson',
    name: 'Custom API (HTTP JSON)',
    description: 'Collect data from any custom HTTP JSON endpoint.',
    iconType: 'logstashInput',
    categoryIds: ['custom'],
  },
];

export const getInstalledIntegrations = () => VISION_INTEGRATIONS.filter((i) => i.isInstalled);
