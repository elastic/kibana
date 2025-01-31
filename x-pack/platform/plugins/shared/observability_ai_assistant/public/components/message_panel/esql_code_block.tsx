/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  UseEuiTheme,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ChatActionClickHandler, ChatActionClickType } from '../chat/types';

const getCodeBlockClassName = (theme: UseEuiTheme) => css`
  background-color: ${theme.euiTheme.colors.lightestShade};
  .euiCodeBlock__pre {
    margin-bottom: 0;
    padding: ${theme.euiTheme.size.m};
    min-block-size: 48px;
  }
  .euiCodeBlock__controls {
    inset-block-start: ${theme.euiTheme.size.m};
    inset-inline-end: ${theme.euiTheme.size.m};
  }
`;

function CodeBlockWrapper({ children }: { children: React.ReactNode }) {
  const theme = useEuiTheme();
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="s"
      className={getCodeBlockClassName(theme)}
    >
      {children}
    </EuiPanel>
  );
}

export function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <CodeBlockWrapper>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiCodeBlock isCopyable fontSize="m">
            {children}
          </EuiCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
    </CodeBlockWrapper>
  );
}

export function EsqlCodeBlock({
  value,
  actionsDisabled,
  onActionClick,
}: {
  value: string;
  actionsDisabled: boolean;
  onActionClick: ChatActionClickHandler;
}) {
  return (
    <CodeBlockWrapper>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiCodeBlock isCopyable fontSize="m">
            {value}
          </EuiCodeBlock>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="observabilityAiAssistantEsqlCodeBlockRunThisQueryButton"
                size="xs"
                iconType="play"
                onClick={() =>
                  onActionClick({ type: ChatActionClickType.executeEsqlQuery, query: value })
                }
                disabled={actionsDisabled}
              >
                {i18n.translate('xpack.observabilityAiAssistant.runThisQuery', {
                  defaultMessage: 'Display results',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="observabilityAiAssistantEsqlCodeBlockVisualizeThisQueryButton"
                size="xs"
                iconType="lensApp"
                onClick={() =>
                  onActionClick({ type: ChatActionClickType.visualizeEsqlQuery, query: value })
                }
                disabled={actionsDisabled}
              >
                {i18n.translate('xpack.observabilityAiAssistant.visualizeThisQuery', {
                  defaultMessage: 'Visualize this query',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </CodeBlockWrapper>
  );
}
