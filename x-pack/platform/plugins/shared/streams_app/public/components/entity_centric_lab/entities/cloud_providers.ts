/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityHealth } from './fake_entities';

/**
 * Cloud provider / service taxonomy for the entity-centric lab.
 *
 * Single source of truth that drives:
 *   - The nested Cloud left-nav (Cloud > AWS/GCP/Azure > service) and the
 *     matching deep links registered in `streams_app/public/plugin.tsx`.
 *   - The `/entities/cloud/{provider}` and `/entities/cloud/{provider}/{service}`
 *     routes and the provider/service page scoping in `AllEntitiesView`.
 *   - The seeded Cloud entities (`buildCloudEntities` in `fake_entities.ts`),
 *     where every entity carries `provider` + `subType` (the service label).
 *
 * Keeping the whole hierarchy in one place means adding a provider or a
 * service is a single edit here plus the deep links; everything else is
 * derived.
 */

export type CloudProviderId = 'aws' | 'gcp' | 'azure';

export interface CloudServiceDescriptor {
  /** URL segment, e.g. `ec2` in `/entities/cloud/aws/ec2`. */
  readonly id: string;
  /** Short display label used in nav + page headers, e.g. `EC2`. */
  readonly label: string;
  /** Maps to `Entity.type` on the seeded instances, e.g. `AWS EC2 Instance`. */
  readonly entityType: string;
  /** Seeded instances so every service page has demo data. */
  readonly instances: ReadonlyArray<{ readonly name: string; readonly health: EntityHealth }>;
}

export interface CloudProviderDescriptor {
  /** URL segment, e.g. `aws` in `/entities/cloud/aws`. */
  readonly id: CloudProviderId;
  readonly label: string;
  /** EUI icon type (`logoAWS` / `logoGCP` / `logoAzure`). */
  readonly icon: string;
  readonly services: readonly CloudServiceDescriptor[];
}

export const CLOUD_PROVIDERS: readonly CloudProviderDescriptor[] = [
  {
    id: 'aws',
    label: 'AWS',
    icon: 'logoAWS',
    services: [
      {
        id: 'ec2',
        label: 'EC2',
        entityType: 'AWS EC2 Instance',
        instances: [
          { name: 'i-0a1b2c3d4e5f6789a', health: 'unhealthy' },
          { name: 'i-04e5f6a708b9c1d2e', health: 'healthy' },
          { name: 'i-0b9c1d2e304e5f6a7', health: 'atRisk' },
          { name: 'i-0e5f6a708b9c1d2e3', health: 'healthy' },
        ],
      },
      {
        id: 'lambda',
        label: 'Lambda',
        entityType: 'AWS Lambda function',
        instances: [
          { name: 'orders-api-handler', health: 'healthy' },
          { name: 'fraud-screener', health: 'atRisk' },
          { name: 'checkout-webhook', health: 'healthy' },
          { name: 'auth-callback', health: 'unhealthy' },
        ],
      },
      {
        id: 's3',
        label: 'S3',
        entityType: 'AWS S3 bucket',
        instances: [
          { name: 'payflow-receipts', health: 'healthy' },
          { name: 'payments-audit-logs', health: 'healthy' },
          { name: 'merchant-assets', health: 'healthy' },
          { name: 'analytics-exports', health: 'atRisk' },
        ],
      },
    ],
  },
  {
    id: 'gcp',
    label: 'GCP',
    icon: 'logoGCP',
    services: [
      {
        id: 'compute',
        label: 'Compute Engine',
        entityType: 'GCP Compute Engine',
        instances: [
          { name: 'gce-orders-eu-1', health: 'healthy' },
          { name: 'gce-orders-eu-2', health: 'atRisk' },
          { name: 'gce-fraud-us-1', health: 'unhealthy' },
          { name: 'gce-batch-us-2', health: 'healthy' },
        ],
      },
      {
        id: 'functions',
        label: 'Cloud Functions',
        entityType: 'GCP Cloud Function',
        instances: [
          { name: 'settle-payment', health: 'healthy' },
          { name: 'notify-merchant', health: 'healthy' },
          { name: 'reconcile-ledger', health: 'atRisk' },
        ],
      },
      {
        id: 'storage',
        label: 'Cloud Storage',
        entityType: 'GCP Cloud Storage bucket',
        instances: [
          { name: 'gcs-invoices', health: 'healthy' },
          { name: 'gcs-cold-archive', health: 'healthy' },
          { name: 'gcs-ml-features', health: 'atRisk' },
        ],
      },
    ],
  },
  {
    id: 'azure',
    label: 'Azure',
    icon: 'logoAzure',
    services: [
      {
        id: 'vm',
        label: 'Virtual Machines',
        entityType: 'Azure VM',
        instances: [
          { name: 'vm-payments-we-1', health: 'healthy' },
          { name: 'vm-payments-we-2', health: 'unhealthy' },
          { name: 'vm-checkout-ne-1', health: 'atRisk' },
          { name: 'vm-checkout-ne-2', health: 'healthy' },
        ],
      },
      {
        id: 'functions',
        label: 'Functions',
        entityType: 'Azure Function',
        instances: [
          { name: 'az-webhook-relay', health: 'healthy' },
          { name: 'az-token-refresh', health: 'atRisk' },
          { name: 'az-export-runner', health: 'healthy' },
        ],
      },
      {
        id: 'blob',
        label: 'Blob Storage',
        entityType: 'Azure Blob Storage',
        instances: [
          { name: 'blob-receipts', health: 'healthy' },
          { name: 'blob-audit', health: 'healthy' },
          { name: 'blob-backups', health: 'atRisk' },
        ],
      },
    ],
  },
];

export const getCloudProvider = (id: string): CloudProviderDescriptor | undefined =>
  CLOUD_PROVIDERS.find((provider) => provider.id === id);

export const isKnownCloudProviderId = (value: string): value is CloudProviderId =>
  CLOUD_PROVIDERS.some((provider) => provider.id === value);

export const getCloudService = (
  providerId: string,
  serviceId: string
): CloudServiceDescriptor | undefined =>
  getCloudProvider(providerId)?.services.find((service) => service.id === serviceId);

export const isKnownCloudServiceId = (providerId: string, serviceId: string): boolean =>
  getCloudService(providerId, serviceId) !== undefined;

/**
 * Resolve the provider that owns a given `Entity.type` string (e.g.
 * `AWS EC2 Instance` -> `aws`). Used by the grid/list grouping to bucket
 * cloud entities by provider without relying on the seeded `provider`
 * field being present on every record.
 */
export const getProviderIdForEntityType = (entityType: string): CloudProviderId | undefined => {
  for (const provider of CLOUD_PROVIDERS) {
    if (provider.services.some((service) => service.entityType === entityType)) {
      return provider.id;
    }
  }
  return undefined;
};
