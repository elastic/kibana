/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const labels = {
  prompt: i18n.translate('xpack.agentBuilder.feedback.upInvite.prompt', {
    defaultMessage: 'Glad it helped!',
  }),
  tellUsMore: i18n.translate('xpack.agentBuilder.feedback.upInvite.tellUsMore', {
    defaultMessage: 'Tell us more',
  }),
  dismiss: i18n.translate('xpack.agentBuilder.feedback.upInvite.dismiss', {
    defaultMessage: 'Dismiss',
  }),
};

interface UpInviteProps {
  onTellUsMore: () => void;
  onDismiss: () => void;
}

export const UpInvite: React.FC<UpInviteProps> = ({ onTellUsMore, onDismiss }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="xs">
        <span>{labels.prompt}</span>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty size="xs" onClick={onTellUsMore} data-test-subj="roundFeedbackTellUsMore">
        {labels.tellUsMore}
      </EuiButtonEmpty>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="cross"
        size="xs"
        color="text"
        aria-label={labels.dismiss}
        onClick={onDismiss}
        data-test-subj="roundFeedbackDismissInvite"
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
