/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ILM_POLICY_NAME } from '@kbn/reporting-common';
import { IlmPolicyMigrationStatus } from '@kbn/reporting-common/types';
import {
  REPORTING_DATA_STREAM_ALIAS,
  REPORTING_DATA_STREAM_COMPONENT_TEMPLATE,
  REPORTING_DATA_STREAM_WILDCARD,
  REPORTING_LEGACY_INDICES,
} from '@kbn/reporting-server';

/**
 * Responsible for detecting and provisioning the reporting ILM policy in stateful deployments.
 *
 * Uses the provided {@link ElasticsearchClient} to scope request privileges.
 */
export class IlmPolicyManager {
  constructor(private readonly client: ElasticsearchClient) {}

  public static create(opts: { client: ElasticsearchClient }) {
    return new IlmPolicyManager(opts.client);
  }

  /**
   * Check that the ILM policy exists
   */
  public async doesIlmPolicyExist(): Promise<boolean> {
    try {
      await this.client.ilm.getLifecycle({ name: ILM_POLICY_NAME });
      return true;
    } catch (e) {
      if (e.statusCode === 404) {
        return false;
      }
      throw e;
    }
  }

  /**
   * This method is automatically called on the Stack Management > Reporting page, by the `` API for users with
   * privilege to manage ILM, to notify them when attention is needed to update the policy for any reason.
   */
  public async checkIlmMigrationStatus(): Promise<IlmPolicyMigrationStatus> {
    if (!(await this.doesIlmPolicyExist())) {
      return 'policy-not-found';
    }

    const [reportingDataStreamSettings, reportingLegacyIndexSettings] = await Promise.all([
      this.client.indices.getSettings({
        index: REPORTING_DATA_STREAM_WILDCARD,
      }),
      this.client.indices.getSettings({
        index: REPORTING_LEGACY_INDICES,
      }),
    ]);

    const hasUnmanaged = (settings: estypes.IndicesIndexState) => {
      return (
        settings?.settings?.index?.lifecycle?.name !== ILM_POLICY_NAME &&
        settings?.settings?.['index.lifecycle']?.name !== ILM_POLICY_NAME
      );
    };

    const hasUnmanagedDataStream = Object.values(reportingDataStreamSettings).some(hasUnmanaged);
    const hasUnmanagedIndices = Object.values(reportingLegacyIndexSettings).some(hasUnmanaged);

    return hasUnmanagedDataStream || hasUnmanagedIndices ? 'indices-not-managed-by-policy' : 'ok';
  }

  /**
   * Create the Reporting ILM policy
   */
  public async createIlmPolicy(): Promise<void> {
    await this.client.ilm.putLifecycle({
      name: ILM_POLICY_NAME,
      policy: { phases: { hot: { actions: {} } } },
    });
  }

  /**
   * Update the Data Stream index template with a link to the Reporting ILM policy
   */
  public async linkIlmPolicy() {
    const putTemplateAcknowledged = await this.client.cluster.putComponentTemplate({
      name: REPORTING_DATA_STREAM_COMPONENT_TEMPLATE,
      template: { settings: { lifecycle: { name: ILM_POLICY_NAME } } },
      create: false,
    });

    let backingIndicesAcknowledged: { acknowledged: boolean | null } = { acknowledged: null };
    const backingIndicesExist = await this.client.indices.exists({
      index: REPORTING_DATA_STREAM_ALIAS,
      expand_wildcards: ['hidden'],
    });
    if (backingIndicesExist) {
      backingIndicesAcknowledged = await this.client.indices.putSettings({
        index: REPORTING_DATA_STREAM_ALIAS,
        settings: { lifecycle: { name: ILM_POLICY_NAME } },
      });
    }

    return { putTemplateResponse: putTemplateAcknowledged, backingIndicesAcknowledged };
  }

  /**
   * Update datastream to use ILM policy. If legacy indices exist, this attempts to link
   * the ILM policy to them as well.
   */
  public async migrateIndicesToIlmPolicy() {
    const {
      putTemplateResponse: { acknowledged: putTemplateAcknowledged },
      backingIndicesAcknowledged: { acknowledged: backingIndicesAcknowledged },
    } = await this.linkIlmPolicy();

    let legacyAcknowledged: boolean | null = null;
    const legacyExists = await this.client.indices.exists({
      index: REPORTING_LEGACY_INDICES,
      expand_wildcards: ['hidden'],
    });
    if (legacyExists) {
      const { acknowledged } = await this.client.indices.putSettings({
        index: REPORTING_LEGACY_INDICES,
        settings: { lifecycle: { name: ILM_POLICY_NAME } },
      });
      legacyAcknowledged = acknowledged;
    }

    return { putTemplateAcknowledged, backingIndicesAcknowledged, legacyAcknowledged };
  }
}
