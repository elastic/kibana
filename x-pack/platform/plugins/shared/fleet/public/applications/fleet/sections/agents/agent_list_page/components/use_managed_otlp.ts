/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { sendCreateManagedOtlpApiKey, useStartServices } from '../../../../hooks';

// LaunchDarkly feature flag (FF) ID, evaluated via `core.featureFlags`. Originally defined in
// `observability_onboarding/common/feature_flags.ts` and re-declared here because Fleet (platform
// group) cannot import from the observability solution group.
const IS_MANAGED_OTLP_SERVICE_ENABLED = 'observability.managedOtlpServiceEnabled';

export interface UseManagedOtlpResult {
  /** Whether the MOTLP exporter path should be used (URL present + feature on, or serverless). */
  available: boolean;
  /** Managed OTLP endpoint URL with port suffix, or undefined when unavailable. */
  endpoint?: string;
  /** Encoded `id:key` for the APM-scoped API key, once created. */
  apiKeyEncoded?: string;
  /** Trigger creation of the APM-scoped API key for use with the managed OTLP endpoint. */
  onCreateApiKey: () => Promise<void>;
  isCreatingApiKey: boolean;
}

export function useManagedOtlp(): UseManagedOtlpResult {
  const { cloud, featureFlags, notifications } = useStartServices();

  const isServerless = Boolean(cloud?.isServerlessEnabled);
  const managedOtlpUrl = cloud?.managedOtlp?.url;
  const isFeatureEnabled =
    isServerless || featureFlags.getBooleanValue(IS_MANAGED_OTLP_SERVICE_ENABLED, false);
  const available = isFeatureEnabled && Boolean(managedOtlpUrl);
  const endpoint = available && managedOtlpUrl ? `${managedOtlpUrl}:443` : undefined;

  const [apiKeyEncoded, setApiKeyEncoded] = useState<string | undefined>(undefined);
  const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);

  const onCreateApiKey = useCallback(async () => {
    if (isCreatingApiKey || apiKeyEncoded) return;
    try {
      setIsCreatingApiKey(true);
      const res = await sendCreateManagedOtlpApiKey({
        name: 'managed-otlp',
      });
      setApiKeyEncoded(res.item.encoded);
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.addCollectorFlyout.errorCreatingManagedOtlpApiKey', {
          defaultMessage: 'Error creating managed OTLP API key',
        }),
      });
    }
    setIsCreatingApiKey(false);
  }, [isCreatingApiKey, apiKeyEncoded, notifications.toasts]);

  return {
    available,
    endpoint,
    apiKeyEncoded,
    onCreateApiKey,
    isCreatingApiKey,
  };
}
