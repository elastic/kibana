/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const bannerTitle = i18n.translate('xpack.agentBuilder.modeSuggestion.title', {
  defaultMessage: 'Switch to planning mode?',
});

const acceptLabel = i18n.translate('xpack.agentBuilder.modeSuggestion.accept', {
  defaultMessage: 'Switch to Plan',
});

const dismissLabel = i18n.translate('xpack.agentBuilder.modeSuggestion.dismiss', {
  defaultMessage: 'Continue in Agent mode',
});

interface ModeSuggestionBannerProps {
  reason: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export const ModeSuggestionBanner: React.FC<ModeSuggestionBannerProps> = ({
  reason,
  onAccept,
  onDismiss,
}) => {
  return (
    <EuiCallOut
      title={bannerTitle}
      color="primary"
      iconType="sparkles"
      data-test-subj="agentBuilderModeSuggestionBanner"
    >
      <p>{reason}</p>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="primary"
            onClick={onAccept}
            data-test-subj="agentBuilderModeSuggestionAccept"
          >
            {acceptLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={onDismiss}
            data-test-subj="agentBuilderModeSuggestionDismiss"
          >
            {dismissLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
