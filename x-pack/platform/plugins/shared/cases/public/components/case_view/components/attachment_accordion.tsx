/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiNotificationBadge,
  EuiText,
  useGeneratedHtmlId,
  EuiPanel,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

interface AttachmentAccordionProps {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}

export const AttachmentAccordion = ({ id, title, count, children }: AttachmentAccordionProps) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: `case-view-attachment-${id}` });
  return (
    <EuiFlexItem grow={false}>
      <EuiPanel hasBorder>
        <EuiAccordion
          id={accordionId}
          data-test-subj={`case-view-attachment-accordion-${id}`}
          buttonProps={{ 'data-test-subj': `case-view-attachment-accordion-toggle-${id}` }}
          initialIsOpen
          buttonContent={
            <EuiText size="s">
              <h4
                css={css`
                  display: inline-flex;
                  align-items: center;
                `}
              >
                {title}
                <EuiNotificationBadge
                  css={css`
                    margin-left: ${euiTheme.size.s};
                  `}
                  color="subdued"
                  data-test-subj={`case-view-attachment-badge-${id}`}
                >
                  {count}
                </EuiNotificationBadge>
              </h4>
            </EuiText>
          }
        >
          {children}
        </EuiAccordion>
      </EuiPanel>
    </EuiFlexItem>
  );
};
AttachmentAccordion.displayName = 'AttachmentAccordion';
