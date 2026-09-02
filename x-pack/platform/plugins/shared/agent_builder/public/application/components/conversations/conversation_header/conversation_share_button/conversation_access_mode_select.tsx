/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiText,
  useEuiTheme,
  type UseEuiTheme,
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

const generalAccessLabelStyle = ({ euiTheme }: UseEuiTheme) => css`
  row-gap: ${euiTheme.size.s};
`;

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

  return (
    <EuiFormRow label={generalAccessLabel} fullWidth css={generalAccessLabelStyle}>
      <EuiSuperSelect<ConversationAccessControlMode>
        fullWidth
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
    </EuiFormRow>
  );
};
