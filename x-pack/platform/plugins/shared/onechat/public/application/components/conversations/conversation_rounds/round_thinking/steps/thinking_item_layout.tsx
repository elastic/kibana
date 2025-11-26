/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSplitPanel,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ToolCallStep } from '@kbn/onechat-common';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const labels = {
  parameters: i18n.translate('xpack.onechat.round.thinking.steps.thinkingItemLayout.parameters', {
    defaultMessage: 'Parameters',
  }),
};

interface AccordionProps {
  children: ReactNode;
  accordionContent: ToolCallStep['params'];
}
const Accordion = ({ children, accordionContent }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const accordionId = useGeneratedHtmlId({
    prefix: 'accordionId',
  });
  return (
    <EuiAccordion
      id={accordionId}
      arrowDisplay="none"
      buttonContent={children}
      extraAction={
        <EuiButtonIcon
          iconType={isOpen ? 'eyeClosed' : 'eye'}
          aria-label={isOpen ? 'Close' : 'Open'}
          onClick={() => setIsOpen(!isOpen)}
          color="text"
        />
      }
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={(open) => setIsOpen(open)}
    >
      <EuiPanel
        color="plain"
        css={css`
          padding-left: 0px;
        `}
      >
        <EuiSplitPanel.Outer hasBorder hasShadow={false}>
          <EuiSplitPanel.Inner color="plain" grow={false} paddingSize="m">
            <EuiText size="s">
              <strong>{labels.parameters}</strong>
            </EuiText>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner paddingSize="none">
            <EuiCodeBlock language="esql" isCopyable paddingSize="m" lineNumbers>
              {JSON.stringify(accordionContent, null, 2)}
            </EuiCodeBlock>
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiPanel>
    </EuiAccordion>
  );
};
interface ThinkingItemLayoutProps {
  children: ReactNode;
  icon?: ReactNode;
  accordionContent?: ToolCallStep['params']; // potentially to be extended in the future to accomodate other types of content
}
export const ThinkingItemLayout: React.FC<ThinkingItemLayoutProps> = ({
  children,
  icon,
  accordionContent,
}) => {
  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="m"
      alignItems={accordionContent ? undefined : 'center'}
      responsive={false}
    >
      {icon && <EuiFlexItem grow={false}>{icon}</EuiFlexItem>}
      <EuiFlexItem>
        {accordionContent ? (
          <Accordion children={children} accordionContent={accordionContent} />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
            <EuiFlexItem grow={false}>{children}</EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
