/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiMarkdownFormat, EuiProgress, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ClaimItem } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { ClaimSection } from './claim_section';
import * as i18n from './translations';

export interface ClaimDetailsProps {
  claim: ClaimItem;
  onOpenConversation: () => void;
}

/** The read-only view of a claim: question, conclusion, note, reasoning, confidence, gaps. */
export const ClaimDetails: React.FC<ClaimDetailsProps> = ({ claim, onOpenConversation }) => {
  const { euiTheme } = useEuiTheme();
  const { claim: details, status } = claim;

  return (
    <>
      <ClaimSection title={i18n.SECTION_QUESTION}>
        <EuiText size="s" data-test-subj="investigationClaimQuestion">
          {details.question}
        </EuiText>
      </ClaimSection>
      {details.conclusion ? (
        <ClaimSection title={i18n.FIELD_CONCLUSION}>
          <EuiText size="s" data-test-subj="investigationClaimConclusion">
            {details.conclusion}
          </EuiText>
        </ClaimSection>
      ) : null}
      {details.note ? (
        <ClaimSection title={i18n.NOTE_TITLE[status]}>
          <EuiText size="s" data-test-subj="investigationClaimNote">
            {details.note}
          </EuiText>
        </ClaimSection>
      ) : null}
      {details.reasoning ? (
        <ClaimSection title={i18n.FIELD_REASONING}>
          <EuiMarkdownFormat textSize="s" data-test-subj="investigationClaimReasoning">
            {details.reasoning}
          </EuiMarkdownFormat>
        </ClaimSection>
      ) : null}
      {details.confidence !== null && details.confidence !== undefined ? (
        <ClaimSection title={i18n.FIELD_CONFIDENCE}>
          <EuiProgress
            value={details.confidence}
            max={100}
            size="m"
            color={details.confidence >= 70 ? 'success' : 'primary'}
            valueText={`${details.confidence}%`}
            aria-label={i18n.FIELD_CONFIDENCE}
            data-test-subj="investigationClaimConfidence"
          />
        </ClaimSection>
      ) : null}
      {details.gaps.length > 0 ? (
        <ClaimSection title={i18n.SECTION_GAPS} count={details.gaps.length}>
          <ul
            css={css`
              margin: 0;
              padding-inline-start: ${euiTheme.size.l};
            `}
            data-test-subj="investigationClaimGaps"
          >
            {details.gaps.map((gap) => (
              <li key={gap}>
                <EuiText size="s">{gap}</EuiText>
              </li>
            ))}
          </ul>
        </ClaimSection>
      ) : null}
      {details.source_message ? (
        <ClaimSection title={i18n.SECTION_SOURCE_MESSAGE}>
          <EuiBadge
            color="hollow"
            iconType={ICONS.conversation}
            onClick={onOpenConversation}
            onClickAriaLabel={i18n.OPEN_CONVERSATION}
            data-test-subj="investigationClaimSourceMessage"
          >
            {details.source_message.label}
          </EuiBadge>
          {details.source_message.excerpt ? (
            <EuiText size="xs" color="subdued">
              {details.source_message.excerpt}
            </EuiText>
          ) : null}
        </ClaimSection>
      ) : null}
    </>
  );
};
ClaimDetails.displayName = 'ClaimDetails';
