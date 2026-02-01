/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { canSendTelemetry } from '../utils';

interface Props {
  core: CoreStart;
  cloud?: CloudStart;
}

export const FeedbackTriggerButton = ({ core, cloud }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [enabledFeedbackButton, setEnabledFeedbackButton] = useState(false);

  const handleShowFeedbackContainer = () => {
    // Only load the feedback container if we know the user can send telemetry
    Promise.all([import('./feedback_container'), import('@kbn/react-kibana-mount')]).then(
      ([{ FeedbackContainer }, { toMountPoint }]) => {
        const feedbackContainer = core.overlays.openModal(
          toMountPoint(
            <FeedbackContainer
              core={core}
              cloud={cloud}
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

  useEffect(() => {
    setIsLoading(true);

    canSendTelemetry(core.analytics)
      .then((canSend) => {
        if (canSend) {
          setEnabledFeedbackButton(true);
        }
      })
      .catch(() => {
        setEnabledFeedbackButton(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [core.analytics]);

  return (
    <EuiHeaderSectionItemButton
      data-test-subj="feedbackTriggerButton"
      aria-haspopup="dialog"
      aria-label={i18n.translate('feedback.triggerButton.ariaLabel', {
        defaultMessage: 'Give feedback',
      })}
      onClick={handleShowFeedbackContainer}
      isLoading={isLoading}
      disabled={!enabledFeedbackButton}
    >
      <EuiIcon type="comment" size="m" />
    </EuiHeaderSectionItemButton>
  );
};
