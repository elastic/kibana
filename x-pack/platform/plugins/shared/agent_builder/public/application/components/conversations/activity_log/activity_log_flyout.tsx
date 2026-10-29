/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { flyoutMenuRowStyles } from '../../../../flyout/flyout_menu_row_styles';
import { useConversationFlyoutSessionProps } from '../../../hooks/use_conversation_flyout_session_props';
import { ActivityLogContent } from './activity_log_content';

const FLYOUT_WIDTH = 500;

const title = i18n.translate('xpack.agentBuilder.activityLog.title', {
  defaultMessage: 'Activity log',
});

const closeAriaLabel = i18n.translate('xpack.agentBuilder.activityLog.closeAriaLabel', {
  defaultMessage: 'Close activity log',
});

interface ActivityLogFlyoutProps {
  onClose: () => void;
}

export const ActivityLogFlyout: React.FC<ActivityLogFlyoutProps> = ({ onClose }) => {
  const flyoutSessionProps = useConversationFlyoutSessionProps(title);

  return (
    <EuiFlyout
      type="push"
      size={FLYOUT_WIDTH}
      ownFocus={false}
      onClose={onClose}
      closeButtonProps={{ 'aria-label': closeAriaLabel }}
      flyoutMenuDisplayMode="always"
      css={flyoutMenuRowStyles}
      role="region"
      aria-labelledby="agentBuilderActivityLogTitle"
      data-test-subj="agentBuilderActivityLogFlyout"
      {...flyoutSessionProps}
    >
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h2 id="agentBuilderActivityLogTitle">{title}</h2>
        </EuiTitle>
        <EuiSpacer size="l" />
        <ActivityLogContent />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
