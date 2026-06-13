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
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';

const labels = {
  collapse: i18n.translate('xpack.agentBuilder.roundEvents.masterToggle.collapse', {
    defaultMessage: 'Collapse reasoning',
  }),
  show: i18n.translate('xpack.agentBuilder.roundEvents.masterToggle.show', {
    defaultMessage: 'Show reasoning',
  }),
};
interface MasterToggleProps {
  expanded: boolean;
  onToggle: () => void;
}

export const MasterToggle: React.FC<MasterToggleProps> = ({ expanded, onToggle }) => {
  const { euiTheme } = useEuiTheme();

  const label = expanded ? labels.collapse : labels.show;

  const textDisabledStyles = css`
    color: ${euiTheme.colors.textDisabled};
  `;

  const linkStyles = css`
    color: ${euiTheme.colors.textDisabled};
    padding-top: ${euiTheme.size.s};
    padding-bottom: ${euiTheme.size.s};
  `;

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiLink
          css={linkStyles}
          onClick={onToggle}
          role="button"
          data-test-subj="agentBuilderThinkingToggle"
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.conversation.THINKING_TOGGLE,
            detail: 'conversation',
          })}
        >
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" css={textDisabledStyles}>
                {label}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type={expanded ? 'arrowUp' : 'arrowDown'} size="s" aria-hidden />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
