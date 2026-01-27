/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS } from '@kbn/management-settings-ids';
import { FeatureNotEnabledError } from '../../lib/streams/errors/feature_not_enabled_error';

export async function assertAttachmentsAccess({
  uiSettingsClient,
}: {
  uiSettingsClient: IUiSettingsClient;
}): Promise<void> {
  const enabled = await uiSettingsClient.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS);
  if (!enabled) {
    throw new FeatureNotEnabledError(
      `Attachments is disabled. Enable ${OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS} to start using it.`
    );
  }
}
