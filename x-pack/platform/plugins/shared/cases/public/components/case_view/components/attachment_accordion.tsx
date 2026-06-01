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
import React, { useCallback, useState } from 'react';

interface AttachmentAccordionProps {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}

export const AttachmentAccordion = ({ id, title, count, children }: AttachmentAccordionProps) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: `case-view-attachment-${id}` });
  // Controlled isOpen so we can fully unmount children when collapsed
  const [isOpen, setIsOpen] = useState(true);
  const onToggle = useCallback((nextIsOpen: boolean) => setIsOpen(nextIsOpen), []);
  return (
    <EuiFlexItem grow={false}>
      <EuiPanel hasBorder>
        <EuiAccordion
          id={accordionId}
          data-test-subj={`case-view-attachment-accordion-${id}`}
          buttonProps={{ 'data-test-subj': `case-view-attachment-accordion-toggle-${id}` }}
          forceState={isOpen ? 'open' : 'closed'}
          onToggle={onToggle}
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
          {isOpen ? children : null}
        </EuiAccordion>
      </EuiPanel>
    </EuiFlexItem>
  );
};
AttachmentAccordion.displayName = 'AttachmentAccordion';
