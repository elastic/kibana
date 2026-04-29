/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { uniq } from 'lodash';
import { useAIAssistantAppService } from '../hooks/use_ai_assistant_app_service';
import { useGenAIConnectors } from '../hooks/use_genai_connectors';
import { nonNullable } from '../utils/non_nullable';

const starterPromptClassName = css`
  max-width: 50%;
  min-width: calc(50% - 8px);
`;

const starterPromptInnerClassName = css`
  text-align: left !important;
`;

const starterPromptTextClassName = css`
  margin: 0;
  white-space: normal;
  word-break: break-word;
`;

export function StarterPrompts({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  const service = useAIAssistantAppService();
  const { connectors } = useGenAIConnectors();

  if (!connectors || connectors.length === 0) {
    return null;
  }

  const contexts = service.getScreenContexts();

  const starterPrompts = uniq(
    [...contexts]
      .reverse()
      .flatMap((context) => context.starterPrompts)
      .filter(nonNullable)
      .slice(0, 4)
  );

  return (
    <EuiFlexGroup direction="row" gutterSize="xs" wrap>
      {starterPrompts.map(({ prompt, icon }) => (
        <EuiFlexItem key={prompt} className={starterPromptClassName}>
          <EuiPanel
            paddingSize="s"
            hasShadow={false}
            hasBorder
            onClick={() => onSelectPrompt(prompt)}
            className={starterPromptInnerClassName}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={icon} size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <p className={starterPromptTextClassName}>{prompt}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
