/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
import { getLegacyLogsStatus } from './utils';
import { LEGACY_LOGS_CALLOUT_DISMISSED_KEY } from './constants';

interface LegacyLogsDeprecationCalloutProps {
  streamsStatus: WiredStreamsStatus | undefined;
  openFlyout: () => void;
}

export function LegacyLogsDeprecationCallout({
  streamsStatus,
  openFlyout,
}: LegacyLogsDeprecationCalloutProps) {
  const [isDismissed, setIsDismissed] = useLocalStorage(LEGACY_LOGS_CALLOUT_DISMISSED_KEY, false);

  const shouldShowCallout = React.useMemo(() => {
    if (isDismissed || !streamsStatus) return false;
    const { hasLegacyLogs, hasNewStreams } = getLegacyLogsStatus(streamsStatus);
    return hasLegacyLogs && !hasNewStreams;
  }, [isDismissed, streamsStatus]);

  const handleDismiss = React.useCallback(() => {
    setIsDismissed(true);
  }, [setIsDismissed]);

  if (!shouldShowCallout) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.streams.legacyLogsDeprecationCallout.title', {
          defaultMessage: 'New root streams for 9.4',
        })}
        color="warning"
        iconType="warning"
        size="s"
        onDismiss={handleDismiss}
        data-test-subj="legacyLogsDeprecationCallout"
      >
        <p>
          {i18n.translate('xpack.streams.legacyLogsDeprecationCallout.message', {
            defaultMessage:
              'To improve data storage, wired streams now have two root streams, logs.ecs and logs.otel. You need to enable wired streams to align your configuration with this update.',
          })}
        </p>
        <EuiButton
          color="warning"
          size="s"
          onClick={openFlyout}
          data-test-subj="legacyLogsDeprecationCalloutEnableButton"
        >
          {i18n.translate('xpack.streams.legacyLogsDeprecationCallout.enableButton', {
            defaultMessage: 'Enable wired streams',
          })}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
