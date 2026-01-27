/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';

export function FeedbackButtons() {
  const [hasReacted, setHasReacted] = React.useState(false);

  if (hasReacted) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {i18n.translate('xpack.streams.significantEventsSummary.thankYouForYourFeedbackLabel', {
            defaultMessage: 'Thank you for your feedback!',
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.streams.significantEventsSummary.feedbackUsefulLabel', {
          defaultMessage: 'Was this summary helpful?',
        })}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="thumbUp"
          aria-label={i18n.translate('xpack.streams.significantEventsSummary.thumbsUpLabel', {
            defaultMessage: 'Helpful',
          })}
          color="success"
          data-test-subj="significant_events_summary_helpful_button"
          onClick={() => setHasReacted(true)}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="thumbDown"
          aria-label={i18n.translate('xpack.streams.significantEventsSummary.thumbsDownLabel', {
            defaultMessage: 'Not helpful',
          })}
          color="danger"
          data-test-subj="significant_events_summary_not_helpful_button"
          onClick={() => setHasReacted(true)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
