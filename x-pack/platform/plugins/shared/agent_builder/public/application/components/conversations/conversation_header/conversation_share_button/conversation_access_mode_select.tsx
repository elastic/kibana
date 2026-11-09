/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';
import {
  generalAccessLabel,
  publicHelpLabel,
  publicLabel,
  restrictedHelpLabel,
  restrictedLabel,
} from './conversation_share_i18n';

interface AccessModeOptionProps {
  label: string;
  helpText: string;
}

const AccessModeOption: React.FC<AccessModeOptionProps> = ({ label, helpText }) => (
  <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
    <EuiFlexItem>
      <EuiText size="s">
        <strong>{label}</strong>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiText size="xs" color="subdued">
        {helpText}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const accessModeOptions = [
  {
    value: ConversationAccessControlMode.Private,
    inputDisplay: <AccessModeOption label={restrictedLabel} helpText={restrictedHelpLabel} />,
    dropdownDisplay: <AccessModeOption label={restrictedLabel} helpText={restrictedHelpLabel} />,
  },
  {
    value: ConversationAccessControlMode.Public,
    inputDisplay: <AccessModeOption label={publicLabel} helpText={publicHelpLabel} />,
    dropdownDisplay: <AccessModeOption label={publicLabel} helpText={publicHelpLabel} />,
  },
];

interface ConversationAccessModeSelectProps {
  accessMode: ConversationAccessControlMode;
  isSaving: boolean;
  onAccessModeChange: (nextAccessMode: ConversationAccessControlMode) => void;
}

export const ConversationAccessModeSelect: React.FC<ConversationAccessModeSelectProps> = ({
  accessMode,
  isSaving,
  onAccessModeChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'conversationShareGeneralAccess' });

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiTitle size="xxxs">
        <h4 id={titleId}>{generalAccessLabel}</h4>
      </EuiTitle>
      <EuiSuperSelect<ConversationAccessControlMode>
        fullWidth
        aria-labelledby={titleId}
        valueOfSelected={accessMode}
        options={accessModeOptions}
        onChange={onAccessModeChange}
        disabled={isSaving}
        style={{
          minHeight: euiTheme.size.xxxl,
          lineHeight: 'normal',
          paddingTop: euiTheme.size.xs,
          paddingBottom: euiTheme.size.xs,
        }}
        popoverProps={{
          panelPaddingSize: 'none',
          anchorPosition: 'downRight',
        }}
        data-test-subj="agentBuilderConversationSharingAccessModeSelect"
      />
    </EuiFlexGroup>
  );
};
