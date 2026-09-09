/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import type { RenderIacTemplateIntegration } from '../../../../common/types/rest_spec/iac_provisioner';
import type { VerifyCloudConnectorIacKeyResponse } from '../../../../common/types/rest_spec/cloud_connector';
import { sendVerifyCloudConnectorIacKey } from '../../../hooks/use_request/iac_provisioner';

export interface UseVerifyIacKeyParams {
  cloudConnectorId: string | undefined;
  /** The integration being added; omit to check the connector's current set only (flyout). */
  integration?: RenderIacTemplateIntegration;
  enabled: boolean;
}

export const VERIFY_IAC_KEY_QUERY_KEY = 'cloud-connector-verify-iac-key';

export const useVerifyIacKey = ({
  cloudConnectorId,
  integration,
  enabled,
}: UseVerifyIacKeyParams) =>
  useQuery<VerifyCloudConnectorIacKeyResponse, Error>(
    [VERIFY_IAC_KEY_QUERY_KEY, cloudConnectorId, integration],
    async () => {
      const { data, error } = await sendVerifyCloudConnectorIacKey(cloudConnectorId as string, {
        integration,
      });
      if (error || !data) {
        throw error ?? new Error('Empty verify response');
      }
      return data;
    },
    { enabled: enabled && Boolean(cloudConnectorId), retry: false, staleTime: 0 }
  );
