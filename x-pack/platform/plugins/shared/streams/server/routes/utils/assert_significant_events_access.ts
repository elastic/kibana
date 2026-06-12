/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { IUiSettingsClient } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE } from '../../../common';
import { SecurityError } from '../../lib/streams/errors/security_error';
import type { StreamsServer } from '../../types';
import { assertEnterpriseLicense } from './assert_enterprise_license';
import { FeatureNotEnabledError } from '../../lib/streams/errors/feature_not_enabled_error';

export async function assertSignificantEventsAccess({
  server,
  licensing,
  uiSettingsClient,
}: {
  server: StreamsServer;
  licensing: LicensingPluginStart;
  uiSettingsClient: IUiSettingsClient;
}): Promise<void> {
  const isAvailableForTier = server.core.pricing.isFeatureAvailable(
    STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id
  );
  if (!isAvailableForTier) {
    throw new SecurityError(`Cannot access API on the current pricing tier`);
  }
  await Promise.all([
    assertEnterpriseLicense(licensing),
    uiSettingsClient.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS).then((value) => {
      if (!value) {
        throw new FeatureNotEnabledError(
          `Significant events is disabled. Enable ${OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS} to start using it.`
        );
      }
    }),
  ]);
}
