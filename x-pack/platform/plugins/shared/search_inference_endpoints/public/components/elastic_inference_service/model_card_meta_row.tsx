/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { messageWithNowrapDate } from '../model_status/message_with_nowrap_date';

interface ModelCardMetaRowProps {
  modelName: string;
  iconType: 'calendar' | 'error' | 'warning';
  iconColor?: 'subdued' | 'warning';
  textColor?: 'subdued' | 'warning';
  message: string;
  tooltip?: string;
  tooltipTitle?: string;
  tooltipTestSubj?: string;
}

export const ModelCardMetaRow = ({
  modelName,
  iconType,
  iconColor,
  textColor,
  message,
  tooltip,
  tooltipTitle,
  tooltipTestSubj,
}: ModelCardMetaRowProps) => {
  const row = (
    <EuiFlexGroup
      component="span"
      alignItems="center"
      gutterSize="s"
      responsive={false}
      tabIndex={tooltip ? 0 : undefined}
      data-test-subj={`eisModelCardMeta-${modelName}`}
    >
      <EuiFlexItem component="span" grow={false}>
        <EuiIcon
          type={iconType}
          color={iconColor}
          aria-hidden={true}
          data-test-subj={`eisModelCardMetaIcon-${modelName}`}
        />
      </EuiFlexItem>
      <EuiFlexItem component="span" grow={false}>
        <EuiText
          component="span"
          size="s"
          color={textColor}
          css={{ whiteSpace: 'nowrap' }}
          data-test-subj={`eisModelCardMetaDate-${modelName}`}
        >
          {message}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  if (!tooltip) {
    return row;
  }

  return (
    <EuiToolTip
      position="bottom"
      title={tooltipTitle}
      content={messageWithNowrapDate(tooltip, message)}
      anchorProps={{ style: { alignSelf: 'flex-start' } }}
      data-test-subj={tooltipTestSubj}
    >
      {row}
    </EuiToolTip>
  );
};
