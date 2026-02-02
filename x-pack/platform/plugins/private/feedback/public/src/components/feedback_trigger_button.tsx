/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

interface Props {
  core: CoreStart;
  cloud?: CloudStart;
  organizationId?: string;
}

export const FeedbackTriggerButton = ({ core, cloud, organizationId }: Props) => {
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
    <EuiHeaderSectionItemButton
      data-test-subj="feedbackTriggerButton"
      aria-haspopup="dialog"
      aria-label={i18n.translate('feedback.triggerButton.ariaLabel', {
        defaultMessage: 'Give feedback',
      })}
      onClick={handleShowFeedbackContainer}
    >
      <EuiIcon type="comment" size="m" />
    </EuiHeaderSectionItemButton>
  );
};
