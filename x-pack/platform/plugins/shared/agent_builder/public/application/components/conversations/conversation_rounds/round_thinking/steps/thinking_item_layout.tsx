/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ToolCallStep } from '@kbn/agent-builder-common';
import type { ReactNode } from 'react';
import React from 'react';
import { codeblockStyles } from './codeblock.styles';

const labels = {
  parameters: i18n.translate(
    'xpack.agentBuilder.round.thinking.steps.thinkingItemLayout.parameters',
    {
      defaultMessage: 'Parameters',
    }
  ),
  close: i18n.translate('xpack.agentBuilder.round.thinking.steps.thinkingItemLayout.close', {
    defaultMessage: 'Close',
  }),
  open: i18n.translate('xpack.agentBuilder.round.thinking.steps.thinkingItemLayout.open', {
    defaultMessage: 'Open',
  }),
};

interface AccordionProps {
  children: ReactNode;
  accordionContent: ToolCallStep['params'];
  textColor?: string;
}
const Accordion = ({ children, accordionContent, textColor }: AccordionProps) => {
  const accordionId = useGeneratedHtmlId({
    prefix: 'accordionId',
  });
  return (
    <EuiAccordion
      css={css`
        color: ${textColor};
      `}
      id={accordionId}
      arrowDisplay="right"
      buttonContent={children}
    >
      <>
        <EuiSpacer size="m" />
        <EuiSplitPanel.Outer hasBorder hasShadow={false}>
          <EuiSplitPanel.Inner color="plain" grow={false} paddingSize="m">
            <EuiText size="s">
              <strong>{labels.parameters}</strong>
            </EuiText>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner paddingSize="none">
            <EuiCodeBlock isCopyable paddingSize="m" lineNumbers css={codeblockStyles}>
              {JSON.stringify(accordionContent, null, 2)}
            </EuiCodeBlock>
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </>
    </EuiAccordion>
  );
};
interface ThinkingItemLayoutProps {
  children: ReactNode;
  icon?: ReactNode;
  accordionContent?: ToolCallStep['params']; // potentially to be extended in the future to accomodate other types of content
  textColor?: string;
}
export const ThinkingItemLayout: React.FC<ThinkingItemLayoutProps> = ({
  children,
  icon,
  accordionContent,
  textColor,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="m"
      alignItems={accordionContent ? undefined : 'center'}
      responsive={false}
    >
      {icon && (
        <EuiFlexItem
          css={css`
            padding-top: ${accordionContent ? euiTheme.size.xs : '0px'};
          `}
          grow={false}
        >
          {icon}
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {accordionContent ? (
          <Accordion textColor={textColor} accordionContent={accordionContent}>
            {children}
          </Accordion>
        ) : (
          <EuiFlexGroup
            css={css`
              color: ${textColor};
            `}
            direction="column"
            gutterSize="l"
            responsive={false}
          >
            <EuiFlexItem grow={false}>{children}</EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
