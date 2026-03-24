/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useInsightsDiscoveryApi } from '../../../../hooks/use_insights_discovery_api';

export function RunDiscoveryButton() {
  const { scheduleInsightsDiscoveryTask, acknowledgeInsightsDiscoveryTask } =
    useInsightsDiscoveryApi();

  const [{ loading }, runDiscovery] = useAsyncFn(async () => {
    try {
      await acknowledgeInsightsDiscoveryTask();
    } catch {
      // Acknowledge is a no-op when no prior task exists; ignore the error
    }
    await scheduleInsightsDiscoveryTask();
  }, [acknowledgeInsightsDiscoveryTask, scheduleInsightsDiscoveryTask]);

  return (
    <EuiButton
      fill
      size="s"
      iconType="sparkles"
      isLoading={loading}
      isDisabled={loading}
      onClick={runDiscovery}
      data-test-subj="streamsRunDiscoveryButton"
    >
      {loading
        ? i18n.translate('xpack.streams.runDiscoveryButton.discoveringLabel', {
            defaultMessage: 'Discovering…',
          })
        : i18n.translate('xpack.streams.runDiscoveryButton.label', {
            defaultMessage: 'Run a discovery',
          })}
    </EuiButton>
  );
}
