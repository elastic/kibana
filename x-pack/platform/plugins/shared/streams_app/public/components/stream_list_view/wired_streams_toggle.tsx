/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSwitch, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
import { LOGS_ECS_STREAM_NAME, LOGS_OTEL_STREAM_NAME } from '@kbn/streams-schema';

interface WiredStreamsToggleProps {
  streamsStatus: WiredStreamsStatus | undefined;
  loading: boolean;
  disabled: boolean;
  onChange: () => void;
}

export function WiredStreamsToggle({
  streamsStatus,
  loading,
  disabled,
  onChange,
}: WiredStreamsToggleProps) {
  // Compute toggle state based on multi-stream logic
  const hasAnyConflict = React.useMemo(() => {
    if (!streamsStatus) return false;
    return (
      streamsStatus.logs === 'conflict' ||
      streamsStatus[LOGS_OTEL_STREAM_NAME] === 'conflict' ||
      streamsStatus[LOGS_ECS_STREAM_NAME] === 'conflict'
    );
  }, [streamsStatus]);

  // Toggle is ON ONLY when both new streams are enabled AND no conflicts
  const isToggleOn = React.useMemo(() => {
    if (!streamsStatus || hasAnyConflict) return false;
    return streamsStatus['logs.otel'] === true && streamsStatus['logs.ecs'] === true;
  }, [streamsStatus, hasAnyConflict]);

  if (loading) {
    return <EuiLoadingSpinner size="l" />;
  }

  return (
    <>
      <EuiSwitch
        label={i18n.translate('xpack.streams.streamsListView.enableWiredStreamsSwitchLabel', {
          defaultMessage: 'Enable wired streams',
        })}
        checked={isToggleOn}
        onChange={onChange}
        data-test-subj="streamsWiredSwitch"
        disabled={disabled}
      />
    </>
  );
}
