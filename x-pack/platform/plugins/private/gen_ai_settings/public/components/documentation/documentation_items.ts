/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourceTypes, type ResourceType } from '@kbn/product-doc-common';
import type {
  InstallationStatusResponse,
  SecurityLabsInstallStatusResponse,
} from '@kbn/product-doc-base-plugin/common/http_api/installation';
import type { ProductDocBasePluginStart } from '@kbn/product-doc-base-plugin/public';
import * as i18n from './translations';
import type { DocumentationStatus } from './types';
import { ELASTIC_DOCS_ID, SECURITY_LABS_ID } from './types';

type StatusResponseFor<T extends ResourceType> = T extends typeof ResourceTypes.securityLabs
  ? SecurityLabsInstallStatusResponse
  : InstallationStatusResponse;

const getStatusForResourceType = async <T extends ResourceType>({
  productDocBase,
  inferenceId,
  resourceType,
}: {
  productDocBase: ProductDocBasePluginStart;
  inferenceId: string;
  resourceType: T;
}): Promise<StatusResponseFor<T>> => {
  // The transport type is a union; this wrapper ties the response type to the requested resourceType.
  return (await productDocBase.installation.getStatus({
    inferenceId,
    resourceType,
  })) as StatusResponseFor<T>;
};

export interface NormalizedDocStatus {
  status: DocumentationStatus;
  updateAvailable?: boolean;
  /** ISO 8601 LastModified of the newer repository artifact, when an update is available. */
  availableArtifactLastModified?: string;
  /** Major.minor stack version of that artifact, when it is a versioned zip. */
  availableStackVersion?: string;
  failureReason?: string;
  /** ISO 8601 time the documentation was last installed. Present when status is `installed`. */
  installedAt?: string;
  /**
   * ISO 8601 LastModified of the installed zip. Together with `installedStackVersion`
   * this is the installed release, for example `9.6 | Sep 28, 2026`.
   */
  artifactLastModified?: string;
  /**
   * Installed release version shown on the version badge.
   * Product docs use a major.minor stack version. Security labs uses its content version.
   * Omitted when the artifact is identified only by its last-modified date.
   */
  installedStackVersion?: string;
}

const latestTimestamp = (
  perProducts: InstallationStatusResponse['perProducts'] | undefined,
  field: 'updatedAt' | 'artifactLastModified'
): string | undefined => {
  let latest: string | undefined;
  for (const product of Object.values(perProducts ?? {})) {
    if (product.status !== 'installed') {
      continue;
    }
    const value = product[field];
    if (!value) {
      continue;
    }
    if (!latest || value > latest) {
      latest = value;
    }
  }
  return latest;
};

const STACK_VERSION_PATTERN = /^\d+\.\d+$/;

/**
 * Stack version and zip LastModified of the newest installed product doc.
 * Both come from the same product so the version line stays one release, such as `9.6 | Sep 28, 2026`.
 */
const installedRelease = (
  perProducts: InstallationStatusResponse['perProducts'] | undefined
): { installedStackVersion?: string; artifactLastModified?: string } => {
  let stackVersion: string | undefined;
  let artifactLastModified: string | undefined;

  for (const product of Object.values(perProducts ?? {})) {
    if (product.status !== 'installed') {
      continue;
    }
    const modified = product.artifactLastModified;
    const version =
      product.version && STACK_VERSION_PATTERN.test(product.version) ? product.version : undefined;
    if (!modified && !version) {
      continue;
    }
    const isFirst = stackVersion === undefined && artifactLastModified === undefined;
    const isNewer = Boolean(modified && (!artifactLastModified || modified > artifactLastModified));
    if (!isFirst && !isNewer) {
      continue;
    }
    stackVersion = version;
    artifactLastModified = modified;
  }

  return {
    ...(stackVersion ? { installedStackVersion: stackVersion } : {}),
    ...(artifactLastModified ? { artifactLastModified } : {}),
  };
};

export interface DocumentationItemConfig {
  id: string;
  name: string;
  icon: string;
  resourceType: ResourceType;
  supportsUpdates: boolean;
  isTechPreview: boolean;
  isStubbed: boolean;
  /**
   * Typed-by-construction fetcher that returns a unified shape used by the table + polling logic.
   * This keeps `DocumentationSection` extensible as more rows are added.
   */
  getNormalizedStatus: (args: {
    productDocBase: ProductDocBasePluginStart;
    inferenceId: string;
  }) => Promise<NormalizedDocStatus>;
}

/**
 * Centralized, config-driven list of documentation rows shown on GenAI Settings.
 * Adding a new row should be as simple as appending a new config entry here.
 */
export const DOCUMENTATION_ITEMS_CONFIG: readonly DocumentationItemConfig[] = [
  {
    id: ELASTIC_DOCS_ID,
    name: i18n.ELASTIC_DOCS_NAME,
    icon: 'logoElastic',
    resourceType: ResourceTypes.productDoc,
    supportsUpdates: true,
    isTechPreview: false,
    isStubbed: false,
    getNormalizedStatus: async ({ productDocBase, inferenceId }) => {
      const res = await getStatusForResourceType({
        productDocBase,
        inferenceId,
        resourceType: ResourceTypes.productDoc,
      });
      const status = res.overall ?? 'uninstalled';
      const failureReason = Object.values(res.perProducts ?? {})
        .map((p) => p.failureReason)
        .find(Boolean);
      const installedAt =
        status === 'installed' ? latestTimestamp(res.perProducts, 'updatedAt') : undefined;
      const release = status === 'installed' ? installedRelease(res.perProducts) : {};
      return {
        status,
        failureReason,
        ...(installedAt ? { installedAt } : {}),
        ...release,
      };
    },
  },
  {
    id: SECURITY_LABS_ID,
    name: i18n.SECURITY_LABS_NAME,
    icon: 'logoSecurity',
    resourceType: ResourceTypes.securityLabs,
    supportsUpdates: true,
    isTechPreview: false,
    isStubbed: false,
    getNormalizedStatus: async ({ productDocBase, inferenceId }) => {
      const res = await getStatusForResourceType({
        productDocBase,
        inferenceId,
        resourceType: ResourceTypes.securityLabs,
      });
      const status = res.status ?? 'uninstalled';
      return {
        status,
        updateAvailable: Boolean(res.isUpdateAvailable),
        ...(res.availableArtifactLastModified
          ? { availableArtifactLastModified: res.availableArtifactLastModified }
          : {}),
        failureReason: res.failureReason,
        ...(status === 'installed' && res.updatedAt ? { installedAt: res.updatedAt } : {}),
        ...(status === 'installed' && res.version ? { installedStackVersion: res.version } : {}),
        ...(status === 'installed' && res.artifactLastModified
          ? { artifactLastModified: res.artifactLastModified }
          : {}),
      };
    },
  },
];
