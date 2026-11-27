/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

import type { BoostProfileType, BoostRuleMatch } from '../../../common/types';
import {
  MATCHING_DATA_STREAMS_TITLE,
  MATCHING_INDICES_TITLE,
  OUTRANKED_ICON_LABEL,
  getMatchesCount,
  getMatchesCountWithOutranked,
  getOutrankedTooltip,
} from '../../translations';

export interface MatchesPopoverProps {
  /** The consumer's trigger; the popover anchors to it. */
  button: NonNullable<ReactNode>;
  isOpen: boolean;
  closePopover: () => void;
  type: BoostProfileType;
  matches: readonly BoostRuleMatch[];
}

const getListStyles = ({ base }: EuiThemeComputed) => css`
  min-width: ${base * 15}px;
  max-height: ${base * 15}px;
  overflow-y: auto;
`;

const outrankedNameStyles = css`
  text-decoration: line-through;
`;

export const MatchesPopover = ({
  button,
  isOpen,
  closePopover,
  type,
  matches,
}: MatchesPopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'searchBoostMatchesPopoverTitle' });

  const outrankedCount = matches.filter(({ outrankedByRuleName }) => outrankedByRuleName).length;
  const title = type === 'indices' ? MATCHING_INDICES_TITLE : MATCHING_DATA_STREAMS_TITLE;

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downCenter"
      panelPaddingSize="s"
      hasArrow={false}
      aria-labelledby={titleId}
      data-test-subj="searchBoostMatchesPopover"
    >
      <EuiPopoverTitle>
        <span id={titleId}>{title}</span>
        <EuiText size="xs" color="subdued" data-test-subj="searchBoostMatchesPopoverCount">
          {outrankedCount > 0
            ? getMatchesCountWithOutranked(matches.length, outrankedCount)
            : getMatchesCount(matches.length)}
        </EuiText>
      </EuiPopoverTitle>
      <div css={getListStyles(euiTheme)} data-test-subj="searchBoostMatchesPopoverList">
        {matches.map(({ name, outrankedByRuleName }) => (
          <EuiFlexGroup
            key={name}
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            data-test-subj="searchBoostMatchesPopoverItem"
          >
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                color={outrankedByRuleName ? euiTheme.colors.textDisabled : undefined}
                css={outrankedByRuleName ? outrankedNameStyles : undefined}
              >
                {name}
              </EuiText>
            </EuiFlexItem>
            {outrankedByRuleName ? (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="sortAscending"
                  color={euiTheme.colors.textDisabled}
                  aria-label={OUTRANKED_ICON_LABEL}
                  content={getOutrankedTooltip(outrankedByRuleName)}
                  iconProps={{ 'data-test-subj': 'searchBoostMatchesPopoverOutrankedIcon' }}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ))}
      </div>
    </EuiPopover>
  );
};
