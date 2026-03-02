/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useAgentOverrides } from '../../../../../context/agent_overrides/agent_overrides_context';

const modifyButtonLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.modifyButton.label',
  {
    defaultMessage: 'Modify',
  }
);

export const ModifyButton: React.FC = () => {
  const { isDirty, openOverridesPanel } = useAgentOverrides();
  const { euiTheme } = useEuiTheme();

  const containerStyles = css`
    position: relative;
  `;

  const indicatorDotStyles = css`
    position: absolute;
    top: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    background-color: ${euiTheme.colors.primary};
    border-radius: 50%;
    box-shadow: 0 0 4px ${euiTheme.colors.primary};
  `;

  return (
    <EuiFlexItem grow={false} css={containerStyles}>
      <EuiButtonEmpty
        size="s"
        iconType="wrench"
        onClick={openOverridesPanel}
        data-test-subj="agentBuilderModifyButton"
        color={isDirty ? 'primary' : 'text'}
      >
        {modifyButtonLabel}
      </EuiButtonEmpty>
      {isDirty && <span css={indicatorDotStyles} />}
    </EuiFlexItem>
  );
};
