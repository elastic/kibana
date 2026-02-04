/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

interface Props {
  core: CoreStart;
  cloud?: CloudStart;
  organizationId?: string;
}

export const FeedbackTriggerButton = ({ core, cloud, organizationId }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOptedIn, setIsOptedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkTelemetryStatus = async () => {
      try {
        setIsLoading(true);
        const telemetryConfig = await core.http.get<{ optIn: boolean | null }>(
          '/internal/telemetry/config',
          { version: '2' }
        );
        setIsOptedIn(telemetryConfig.optIn);
      } catch (err) {
        setIsOptedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkTelemetryStatus();
  }, [core.http]);

  const handleShowFeedbackContainer = () => {
    Promise.all([import('./feedback_container'), import('@kbn/react-kibana-mount')]).then(
      ([{ FeedbackContainer }, { toMountPoint }]) => {
        const feedbackContainer = core.overlays.openModal(
          toMountPoint(
            <FeedbackContainer
              core={core}
              cloud={cloud}
              organizationId={organizationId}
              hideFeedbackContainer={() => {
                feedbackContainer?.close();
              }}
            />,
            core.rendering
          )
        );
      }
    );
  };

  return (
    <EuiToolTip
      content={
        !isOptedIn &&
        i18n.translate('feedback.triggerButton.tooltip', {
          defaultMessage: 'Enable usage collection to submit feedback',
        })
      }
    >
      <EuiHeaderSectionItemButton
        data-test-subj="feedbackTriggerButton"
        aria-haspopup="dialog"
        aria-label={i18n.translate('feedback.triggerButton.ariaLabel', {
          defaultMessage: 'Submit feedback',
        })}
        onClick={handleShowFeedbackContainer}
        isLoading={isLoading}
        disabled={!isOptedIn}
      >
        <EuiIcon type="comment" size="m" />
      </EuiHeaderSectionItemButton>
    </EuiToolTip>
  );
};
