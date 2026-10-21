/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ECS / OTel-aligned cloud billing boundary on seeded entities.
 * Stored on `Entity.attributes` as `cloudAccountId` / `cloudAccountName`
 * (maps to `cloud.account.id` / `cloud.account.name` in KQL and the data view).
 */

import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';
import type { CloudProviderId } from './cloud_providers';

export const CLOUD_ACCOUNT_ID_ATTR = 'cloudAccountId';
export const CLOUD_ACCOUNT_NAME_ATTR = 'cloudAccountName';

export const CLOUD_ACCOUNT_ECS_ID_FIELD = 'cloud.account.id';
export const CLOUD_ACCOUNT_ECS_NAME_FIELD = 'cloud.account.name';

export const CLOUD_ACCOUNT_COLUMN_ID = 'cloudAccount';

interface DemoCloudAccount {
  readonly id: string;
  readonly name: string;
}

const DEMO_ACCOUNTS: Readonly<Record<CloudProviderId, readonly DemoCloudAccount[]>> = {
  aws: [
    { id: '123456789012', name: 'PayFlow Production' },
    { id: '987654321098', name: 'PayFlow Staging' },
  ],
  gcp: [
    { id: 'payflow-prod-4821', name: 'PayFlow Production' },
    { id: 'payflow-staging-9012', name: 'PayFlow Staging' },
  ],
  azure: [
    { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'PayFlow Production' },
    { id: '00000000-0000-0000-0000-000000000001', name: 'PayFlow Dev' },
  ],
};

const stableHash = (input: string): number => {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33 + input.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

/** Deterministic demo account for a cloud entity (provider + seed string). */
export const pickDemoCloudAccount = (
  provider: CloudProviderId,
  seed: string
): DemoCloudAccount => {
  const pool = DEMO_ACCOUNTS[provider];
  return pool[stableHash(`${provider}-${seed}`) % pool.length];
};

export const mergeCloudAccountAttributes = (
  provider: CloudProviderId,
  seed: string,
  attributes?: Readonly<Record<string, string>>
): Readonly<Record<string, string>> => {
  const account = pickDemoCloudAccount(provider, seed);
  return {
    ...attributes,
    [CLOUD_ACCOUNT_ID_ATTR]: account.id,
    [CLOUD_ACCOUNT_NAME_ATTR]: account.name,
  };
};

export const getCloudAccountId = (entity: Entity): string | undefined =>
  entity.attributes?.[CLOUD_ACCOUNT_ID_ATTR];

export const getCloudAccountName = (entity: Entity): string | undefined =>
  entity.attributes?.[CLOUD_ACCOUNT_NAME_ATTR];

export const cloudAccountNativeTerm = (
  provider: CloudProviderId | undefined
): string => {
  switch (provider) {
    case 'aws':
      return i18n.translate('xpack.streams.entityCentricLab.entities.cloudAccount.native.aws', {
        defaultMessage: 'AWS account',
      });
    case 'azure':
      return i18n.translate('xpack.streams.entityCentricLab.entities.cloudAccount.native.azure', {
        defaultMessage: 'Azure subscription',
      });
    case 'gcp':
      return i18n.translate('xpack.streams.entityCentricLab.entities.cloudAccount.native.gcp', {
        defaultMessage: 'GCP project',
      });
    default:
      return i18n.translate('xpack.streams.entityCentricLab.entities.cloudAccount.native.generic', {
        defaultMessage: 'Cloud account',
      });
  }
};

/** Primary cell text: friendly name when present, otherwise the id. */
export const getCloudAccountDisplayLabel = (entity: Entity): string => {
  const name = getCloudAccountName(entity);
  if (name) return name;
  return getCloudAccountId(entity) ?? '';
};

/** Tooltip / header copy: ECS field + provider-native term. */
export const cloudAccountColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.cloudAccount.columnDescription', {
    defaultMessage:
      'ECS cloud.account.id / cloud.account.name — the billing boundary (AWS account, Azure subscription, or GCP project). Filter with KQL, e.g. cloud.account.name:"PayFlow Production".',
  });

export const cloudAccountCellTitle = (entity: Entity): string | undefined => {
  const id = getCloudAccountId(entity);
  const name = getCloudAccountName(entity);
  if (!id) return undefined;
  const native = cloudAccountNativeTerm(entity.provider);
  if (name && name !== id) {
    return `${native}: ${name} (${id})`;
  }
  return `${native}: ${id}`;
};

/** List/grid bucket keys that default-show the Cloud account column. */
export const bucketKeyShowsCloudAccountByDefault = (bucketKey: string): boolean => {
  if (bucketKey.startsWith('cloud:')) return true;
  const lower = bucketKey.toLowerCase();
  return (
    lower.includes('aws ec2') ||
    lower.includes('compute engine') ||
    lower.includes('azure vm') ||
    lower.includes('lambda function') ||
    lower.includes('cloud function') ||
    lower.includes('azure function') ||
    lower.includes('s3 bucket') ||
    lower.includes('cloud storage') ||
    lower.includes('blob storage')
  );
};
