/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import type { RenderIacTemplateIntegration } from '../../../../common/types/rest_spec/iac_provisioner';
import type { VerifyCloudConnectorIacKeyResponse } from '../../../../common/types/rest_spec/cloud_connector';
import { sendVerifyCloudConnectorIacKey } from '../../../hooks/use_request/cloud_connector';

export interface UseVerifyIacKeyParams {
  cloudConnectorId: string | undefined;
  /**
   * Integrations being added (onboarding); omit or pass an empty array to check the
   * connector's current set only (flyout).
   */
  integrations?: RenderIacTemplateIntegration[];
  /**
   * False asks for the integration set only (outcome `not_checked`): no IaCP comparison, no
   * status write. The flyout uses it on open; the daily task is what discovers upgrades
   * (https://github.com/elastic/ingest-dev/issues/9415).
   */
  compare?: boolean;
  enabled: boolean;
}

export const VERIFY_IAC_KEY_QUERY_KEY = 'cloud-connector-verify-iac-key';
/** Long enough to absorb tab switches and re-mounts; short enough that a stale verdict does not linger. */
export const VERIFY_IAC_KEY_STALE_TIME_MS = 30_000;

export const useVerifyIacKey = ({
  cloudConnectorId,
  integrations,
  compare,
  enabled,
}: UseVerifyIacKeyParams) =>
  useQuery<VerifyCloudConnectorIacKeyResponse, Error>(
    [VERIFY_IAC_KEY_QUERY_KEY, cloudConnectorId, integrations, compare],
    async () => {
      const { data, error } = await sendVerifyCloudConnectorIacKey(cloudConnectorId as string, {
        integrations,
        ...(compare !== undefined ? { compare } : {}),
      });
      if (error || !data) {
        throw error ?? new Error('Empty verify response');
      }
      return data;
    },
    {
      enabled: enabled && Boolean(cloudConnectorId),
      retry: false,
      // A comparing check is a full render on the provisioner (artifact included), so do not
      // re-run it just because the user came back from the CloudFormation tab: a changed
      // integration set changes the query key, and the flyout re-checks explicitly after an
      // Update. Seen in the 2026-09-09 walkthrough: seven identical checks in forty seconds from
      // window-focus refetches.
      refetchOnWindowFocus: false,
      staleTime: VERIFY_IAC_KEY_STALE_TIME_MS,
    }
  );
