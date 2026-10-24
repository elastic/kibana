/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ActivityLogContent, activityLogTitle } from './activity_log_content';

const backLabel = i18n.translate('xpack.agentBuilder.activityLog.backToChat', {
  defaultMessage: 'Back to chat',
});

interface ActivityLogPanelProps {
  onClose: () => void;
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({ onClose }) => {
  const { euiTheme } = useEuiTheme();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      responsive={false}
      data-test-subj="agentBuilderActivityLogPanel"
      css={css`
        width: 100%;
        height: 100%;
        padding: ${euiTheme.size.base};
        overflow-y: auto;
        align-self: stretch;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          iconType="chevronSingleLeft"
          size="s"
          flush="left"
          onClick={onClose}
          data-test-subj="agentBuilderActivityLogBack"
        >
          {backLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2 ref={titleRef} tabIndex={-1}>
            {activityLogTitle}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ActivityLogContent />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
