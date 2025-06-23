/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/css';

interface Props {
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>;
}
const starterPromptClassName = css`
  max-width: 50%;
  min-width: calc(50% - 8px);
`;

const starterPromptInnerClassName = css`
  text-align: center !important;
`;

export const StarterPrompts: React.FC<Props> = ({ setUserPrompt }) => {
  const starterPrompts = [
    {
      description: 'Show me the important alerts from the last 24 hours',
      title: 'User Activity',
      icon: 'bell',
      prompt: 'big long prompt 1',
    },
    {
      description: 'What is the status of my last deployment?',
      title: 'Deployment Status',
      icon: 'sparkles',
      prompt: 'big long prompt 2',
    },
    {
      description: 'What are the top errors in the logs?',
      title: 'Log Analysis',
      icon: 'bullseye',
      prompt: 'big long prompt 3',
    },
    {
      description: 'Can you summarize the latest sales report?',
      title: 'Sales Summary',
      icon: 'questionInCircle',
      prompt: 'big long prompt 4',
    },
  ];

  const onSelectPrompt = useCallback(
    (prompt: string) => {
      setUserPrompt(prompt);
    },
    [setUserPrompt]
  );
  return (
    <EuiFlexGroup direction="row" gutterSize="m" wrap>
      {starterPrompts.map(({ description, title, icon, prompt }) => (
        <EuiFlexItem key={description} className={starterPromptClassName}>
          <EuiPanel
            paddingSize="m"
            hasShadow={false}
            hasBorder
            onClick={() => onSelectPrompt(prompt)}
            className={starterPromptInnerClassName}
          >
            <EuiSpacer size="s" />
            <EuiIcon type={icon} size="xl" />
            <EuiSpacer size="s" />
            <EuiTitle size="xs">
              <h2>{title}</h2>
            </EuiTitle>
            <EuiText size="s">{description}</EuiText>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
