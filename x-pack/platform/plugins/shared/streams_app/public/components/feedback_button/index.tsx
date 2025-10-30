/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';

const STREAMS_FEEDBACK_URL = 'https://ela.st/feedback-streams-ui';

export function FeedbackButton() {
  const {
    isServerless,
    dependencies: {
      start: { cloud },
    },
    services: { version },
  } = useKibana();
  const deploymentType = isServerless
    ? 'Serverless'
    : cloud?.isCloudEnabled
    ? 'Cloud'
    : 'Self-Managed';

  const path = window.location.pathname;

  const queryParams = new URLSearchParams({ environment: deploymentType, version, path });
  const feedbackUrl = `${STREAMS_FEEDBACK_URL}?${queryParams.toString()}`;

  return (
    <EuiButtonEmpty
      size="s"
      iconType="popout"
      href={feedbackUrl}
      target="_blank"
      rel="noopener"
      iconSide="right"
      aria-label={i18n.translate('xpack.streams.feedbackButtonLabel', {
        defaultMessage: 'Give feedback',
      })}
    >
      {i18n.translate('xpack.streams.feedbackButtonLabel', {
        defaultMessage: 'Give feedback',
      })}
    </EuiButtonEmpty>
  );
}
