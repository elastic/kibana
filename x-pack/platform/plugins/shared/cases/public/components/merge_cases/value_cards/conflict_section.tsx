/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

const REVEAL_EVENT = 'mergeConflictSectionReveal';

/** Opens the collapsed section holding an element, if any, so the element can take focus. */
export const revealInSection = (element: HTMLElement) => {
  element.dispatchEvent(new Event(REVEAL_EVENT, { bubbles: true }));
};

export interface ConflictSectionProps {
  title: string;
  /** Words on the right of the title, such as "4 fields · 1 left". */
  summary?: string;
  /** Shown in the warning colour while a field in the section still needs the user. */
  needsAttention?: boolean;
  initialIsOpen?: boolean;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

/**
 * A collapsible group of fields on the Conflicts step, such as the case details or the template's
 * fields.
 */
export const ConflictSection: React.FC<ConflictSectionProps> = ({
  title,
  summary,
  needsAttention = false,
  initialIsOpen = true,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'mergeConflictSection' });
  const titleId = useGeneratedHtmlId({ prefix: 'mergeConflictSectionTitle' });
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const divider = `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`;

  useEffect(() => {
    const panel = panelRef.current;
    if (isOpen || panel == null) {
      return;
    }
    // Synchronous, so the caller can scroll to and focus the element as soon as this returns.
    const open = () => flushSync(() => setIsOpen(true));
    panel.addEventListener(REVEAL_EVENT, open);
    return () => panel.removeEventListener(REVEAL_EVENT, open);
  }, [isOpen]);

  return (
    <EuiPanel
      panelRef={panelRef}
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={css`
        overflow: hidden;
      `}
      data-test-subj={dataTestSubj}
    >
      <section aria-labelledby={titleId}>
        <EuiAccordion
          id={accordionId}
          arrowDisplay="right"
          forceState={isOpen ? 'open' : 'closed'}
          onToggle={setIsOpen}
          buttonContent={
            <EuiTitle size="xs">
              <h3 id={titleId}>{title}</h3>
            </EuiTitle>
          }
          buttonProps={{
            css: css`
              min-width: 0;
              padding: ${euiTheme.size.m} 0 ${euiTheme.size.m} ${euiTheme.size.base};
            `,
            'data-test-subj': 'merge-conflict-section-toggle',
          }}
          extraAction={
            summary != null ? (
              <EuiText
                size="xs"
                color={needsAttention ? 'warning' : 'subdued'}
                css={css`
                  padding-left: ${euiTheme.size.m};
                `}
                data-test-subj="merge-conflict-section-summary"
              >
                {summary}
              </EuiText>
            ) : undefined
          }
          arrowProps={{
            css: css`
              margin: 0 ${euiTheme.size.m} 0 ${euiTheme.size.xs};
            `,
          }}
        >
          <div
            css={css`
              border-top: ${divider};
              & > * + * {
                border-top: ${divider};
              }
            `}
          >
            {children}
          </div>
        </EuiAccordion>
      </section>
    </EuiPanel>
  );
};
ConflictSection.displayName = 'ConflictSection';
