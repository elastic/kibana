/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

const CALLOUT_TITLE = i18n.translate(
  'xpack.streams.significantEvents.connectorNotConfigured.title',
  { defaultMessage: 'No connector configured' }
);

const CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEvents.connectorNotConfigured.description',
  {
    defaultMessage: 'Configure an AI connector in the Significant events settings.',
  }
);

const OPEN_SETTINGS_LABEL = i18n.translate(
  'xpack.streams.significantEvents.connectorNotConfigured.openSettingsLabel',
  { defaultMessage: 'Open settings' }
);

export function ConnectorNotConfiguredCallout() {
  const router = useStreamsAppRouter();
  const settingsHref = router.link('/_discovery/{tab}', { path: { tab: 'settings' } });

  return (
    <EuiCallOut title={CALLOUT_TITLE} color="warning" iconType="warning" size="s">
      {CALLOUT_DESCRIPTION}{' '}
      <EuiLink href={settingsHref} external>
        {OPEN_SETTINGS_LABEL}
      </EuiLink>
    </EuiCallOut>
  );
}
