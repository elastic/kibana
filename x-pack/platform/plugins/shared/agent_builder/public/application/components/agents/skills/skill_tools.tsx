/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
  EuiFlexItem,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { labels } from '../../../utils/i18n';

export interface SkillToolsProps {
  skillToolIds: string[];
  onToolClick: (toolId: string) => void;
}

export const SkillTools = ({ skillToolIds, onToolClick }: SkillToolsProps) => {
  const { euiTheme } = useEuiTheme();

  if (!skillToolIds || skillToolIds.length === 0) return null;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiHorizontalRule margin="l" />
      <EuiTitle size="xs">
        <h4>{labels.skills.toolsLabel}</h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        css={css`
          gap: ${euiTheme.size.s};
        `}
      >
        {skillToolIds.map((toolId) => (
          <EuiFlexItem key={toolId} grow={false}>
            <EuiLink onClick={() => onToolClick(toolId)}>{toolId}</EuiLink>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
