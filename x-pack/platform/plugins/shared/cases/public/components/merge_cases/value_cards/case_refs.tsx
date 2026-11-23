/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import { Status } from '@kbn/cases-components';
import type { MergePreviewCase } from '../../../../common/types/api';
import { CaseHoverCard, getCaseRef } from './case_hover_card';
import * as i18n from './translations';

const DEFAULT_MAX = 3;

/**
 * A case number that opens a card about the case when clicked; the card's title opens the case in
 * a new tab. Neither the number nor the card picks the value card it sits in.
 */
export const CaseRef: React.FC<{
  caseId: string;
  cases: MergePreviewCase[];
  /** Shown while the case isn't among `cases`, such as before the preview loads. */
  label?: string;
}> = ({ caseId, cases, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const theCase = cases.find(({ id }) => id === caseId);
  const caseRef = theCase != null ? getCaseRef(theCase) : label ?? caseId;

  if (theCase == null) {
    return (
      <EuiBadge color="hollow" data-test-subj={`merge-case-ref-${caseId}`}>
        {caseRef}
      </EuiBadge>
    );
  }

  // The number and its card sit inside a selectable value card, and React bubbles the card's clicks
  // out of its portal: both stop their clicks so neither picks the value.
  return (
    <EuiPopover
      button={
        <EuiBadge
          color="hollow"
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen((open) => !open);
          }}
          onClickAriaLabel={i18n.SHOW_CASE_DETAILS(caseRef)}
          aria-expanded={isOpen}
          data-test-subj={`merge-case-ref-${caseId}`}
        >
          {caseRef}
        </EuiBadge>
      }
      aria-label={i18n.CASE_CARD_ARIA(caseRef)}
      isOpen={isOpen}
      closePopover={close}
      anchorPosition="downLeft"
      panelPaddingSize="m"
      panelProps={{
        // Capture, not onClick: an onClick turns the panel into a full-width button.
        onClickCapture: (event: React.MouseEvent) => event.stopPropagation(),
        'data-test-subj': `merge-case-ref-card-${caseId}`,
      }}
    >
      <CaseHoverCard theCase={theCase} />
    </EuiPopover>
  );
};
CaseRef.displayName = 'CaseRef';

const MoreCases: React.FC<{ caseIds: string[]; cases: MergePreviewCase[] }> = ({
  caseIds,
  cases,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback((event: React.MouseEvent) => {
    // The chip can sit inside a selectable card: opening the list must not pick the card's value.
    event.preventDefault();
    event.stopPropagation();
    setIsOpen((open) => !open);
  }, []);

  return (
    <EuiPopover
      aria-label={i18n.MORE_CASES_TITLE(caseIds.length)}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downLeft"
      button={
        <EuiBadge
          color="hollow"
          onClick={toggle}
          onClickAriaLabel={i18n.MORE_CASES_ARIA(caseIds.length)}
          data-test-subj="merge-case-refs-more"
        >
          {i18n.MORE_CASES(caseIds.length)}
        </EuiBadge>
      }
    >
      <EuiPopoverTitle paddingSize="s">{i18n.MORE_CASES_TITLE(caseIds.length)}</EuiPopoverTitle>
      <div
        css={css`
          max-width: 360px;
        `}
        data-test-subj="merge-case-refs-more-list"
      >
        {caseIds.map((caseId) => {
          const theCase = cases.find(({ id }) => id === caseId);
          return (
            <EuiFlexGroup
              key={caseId}
              gutterSize="s"
              alignItems="center"
              responsive={false}
              css={css`
                padding: 4px 0;
              `}
            >
              <EuiFlexItem grow={false}>
                <CaseRef caseId={caseId} cases={cases} />
              </EuiFlexItem>
              <EuiFlexItem
                css={css`
                  min-width: 0;
                `}
              >
                <EuiText size="s" className="eui-textTruncate">
                  {theCase?.title}
                </EuiText>
              </EuiFlexItem>
              {theCase != null ? (
                <EuiFlexItem grow={false}>
                  <Status status={theCase.status} />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          );
        })}
      </div>
    </EuiPopover>
  );
};
MoreCases.displayName = 'MoreCases';

/**
 * The case numbers that hold a value. Up to `max` show; past that, `max - 1` show and a "+N" chip
 * opens the rest.
 */
export const CaseRefs: React.FC<{ caseIds: string[]; cases: MergePreviewCase[]; max?: number }> = ({
  caseIds,
  cases,
  max = DEFAULT_MAX,
}) => {
  const overflows = caseIds.length > max;
  const visible = overflows ? caseIds.slice(0, Math.max(1, max - 1)) : caseIds;
  const hidden = overflows ? caseIds.slice(visible.length) : [];

  return (
    <span
      css={css`
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
      `}
      data-test-subj="merge-case-refs"
    >
      {visible.map((caseId) => (
        <CaseRef key={caseId} caseId={caseId} cases={cases} />
      ))}
      {hidden.length > 0 ? <MoreCases caseIds={hidden} cases={cases} /> : null}
    </span>
  );
};
CaseRefs.displayName = 'CaseRefs';
