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
import React, { useCallback, useEffect, useState } from 'react';
import { useAttachmentAccordionOpenedEBT } from '../../../analytics/use_attachments_tab_ebt';

interface AttachmentAccordionProps {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export const AttachmentAccordion = ({
  id,
  title,
  count,
  children,
  isOpen: controlledIsOpen,
  onToggle: onToggleProp,
}: AttachmentAccordionProps) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: `case-view-attachment-${id}` });
  // Keep the accordion independently usable while allowing the attachments tab to coordinate it.
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(true);
  const isOpen = controlledIsOpen ?? uncontrolledIsOpen;
  const trackAttachmentAccordionOpened = useAttachmentAccordionOpenedEBT();

  // Reports every time the accordion becomes visible, including the initial mount (accordions
  // default to open), not just on user-driven re-opens.
  useEffect(() => {
    if (isOpen) {
      trackAttachmentAccordionOpened(id);
    }
  }, [isOpen, id, trackAttachmentAccordionOpened]);

  const onToggle = useCallback(
    (nextIsOpen: boolean) => {
      if (controlledIsOpen === undefined) {
        setUncontrolledIsOpen(nextIsOpen);
      }
      onToggleProp?.(nextIsOpen);
    },
    [controlledIsOpen, onToggleProp]
  );
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
