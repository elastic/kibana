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
}

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
    supportsUpdates: false,
    isTechPreview: false,
    isStubbed: false,
    getNormalizedStatus: async ({ productDocBase, inferenceId }) => {
      const res = await getStatusForResourceType({
        productDocBase,
        inferenceId,
        resourceType: ResourceTypes.productDoc,
      });
      return { status: res.overall ?? 'uninstalled' };
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
      return {
        status: res.status ?? 'uninstalled',
        updateAvailable: Boolean(res.isUpdateAvailable),
      };
    },
  },
];
