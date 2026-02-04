/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
import { getLegacyLogsStatus } from './utils';

interface LegacyLogsDeprecationCalloutProps {
  streamsStatus: WiredStreamsStatus | undefined;
  openFlyout: () => void;
}

export function LegacyLogsDeprecationCallout({
  streamsStatus,
  openFlyout,
}: LegacyLogsDeprecationCalloutProps) {
  const shouldShowCallout = React.useMemo(() => {
    if (!streamsStatus) return false;
    const { hasLegacyLogs, hasNewStreams } = getLegacyLogsStatus(streamsStatus);
    return hasLegacyLogs && !hasNewStreams;
  }, [streamsStatus]);

  if (!shouldShowCallout) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.streams.legacyLogsDeprecationCallout.title', {
          defaultMessage: 'Welcome to Streams 9.4',
        })}
        color="warning"
        iconType="warning"
        size="m"
        data-test-subj="legacyLogsDeprecationCallout"
      >
        <p>
          {i18n.translate('xpack.streams.legacyLogsDeprecationCallout.message', {
            defaultMessage:
              "You've upgraded your Kibana and Elasticsearch, and from that point we now split Streams into two main roots: ECS and OTEL",
          })}
        </p>
        <EuiButton
          color="warning"
          size="s"
          onClick={openFlyout}
          data-test-subj="legacyLogsDeprecationCalloutEnableButton"
        >
          {i18n.translate('xpack.streams.legacyLogsDeprecationCallout.enableButton', {
            defaultMessage: 'Enable',
          })}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
