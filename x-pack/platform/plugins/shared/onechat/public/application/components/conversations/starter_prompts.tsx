/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import type { StarterPrompt } from '../../../services/types';

interface Props {
  fetchedPromptGroups: StarterPrompt[];
  compressed?: boolean;
  onSelectPrompt?: (prompt: string, title: string) => void;
}

const starterPromptClassName = css`
  max-width: 50%;
  min-width: calc(50% - 8px);
`;

const starterPromptInnerClassName = css`
  text-align: center !important;
  cursor: pointer;
`;

export const StarterPrompts: React.FC<Props> = ({
  compressed = false,
  fetchedPromptGroups,
  onSelectPrompt,
}) => {
  const handleSelectPrompt = useCallback(
    (prompt: string, title: string) => {
      onSelectPrompt?.(prompt, title);
    },
    [onSelectPrompt]
  );

  if (!fetchedPromptGroups || fetchedPromptGroups.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup direction="row" gutterSize="m" wrap>
      {fetchedPromptGroups.map(({ description, title, icon, prompt }) => (
        <EuiFlexItem key={prompt} className={starterPromptClassName}>
          <EuiPanel
            paddingSize={compressed ? 's' : 'm'}
            hasShadow={false}
            hasBorder
            data-test-subj={prompt}
            onClick={() => handleSelectPrompt(prompt, title)}
            className={starterPromptInnerClassName}
          >
            <EuiSpacer size="s" />
            <EuiIcon type={icon} size={compressed ? 'm' : 'xl'} />
            <EuiSpacer size="s" />
            <EuiText size={compressed ? 'xs' : 's'}>
              <h3>{title}</h3>
              <p>{description}</p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
