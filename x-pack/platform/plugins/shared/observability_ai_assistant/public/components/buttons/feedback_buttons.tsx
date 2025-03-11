/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';

export type Feedback = 'positive' | 'negative';

interface FeedbackButtonsProps {
  onClickFeedback: (feedback: Feedback) => void;
}

const THANK_YOU_MESSAGE = i18n.translate(
  'xpack.observabilityAiAssistant.feedbackButtons.em.thanksForYourFeedbackLabel',
  { defaultMessage: 'Thanks for your feedback' }
);

export function FeedbackButtons({ onClickFeedback }: FeedbackButtonsProps) {
  const { notifications } = useKibana().services;

  const [hasBeenClicked, setHasBeenClicked] = useState(false);

  const handleClickPositive = () => {
    onClickFeedback('positive');
    setHasBeenClicked(true);
    notifications.toasts.addSuccess(THANK_YOU_MESSAGE);
  };

  const handleClickNegative = () => {
    onClickFeedback('negative');
    setHasBeenClicked(true);
    notifications.toasts.addSuccess(THANK_YOU_MESSAGE);
  };

  return (
    <EuiFlexGroup responsive={false} direction="row" alignItems="center" gutterSize="s" wrap>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          <em>
            {i18n.translate('xpack.observabilityAiAssistant.insight.feedbackButtons.title', {
              defaultMessage: 'Was this helpful?',
            })}
          </em>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} direction="row" alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="observabilityAiAssistantFeedbackButtonsPositiveButton"
              color="success"
              disabled={hasBeenClicked}
              iconType="faceHappy"
              size="s"
              onClick={handleClickPositive}
            >
              {i18n.translate('xpack.observabilityAiAssistant.insight.feedbackButtons.positive', {
                defaultMessage: 'Yes',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="observabilityAiAssistantFeedbackButtonsNegativeButton"
              color="danger"
              disabled={hasBeenClicked}
              iconType="faceSad"
              size="s"
              onClick={handleClickNegative}
            >
              {i18n.translate('xpack.observabilityAiAssistant.insight.feedbackButtons.negative', {
                defaultMessage: 'No',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
