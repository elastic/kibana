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
import { css } from '@emotion/react';

import { matchesPopoverStrings } from './matches_popover_i18n';

export type MatchedResourceType = 'index' | 'dataStream';

export interface MatchedResource {
  name: string;
  /** Name of the higher-ranked rule that applies to this resource instead. */
  outrankedByRuleName?: string;
}

export interface MatchesPopoverProps {
  /** The consumer's trigger; the popover anchors to it. */
  button: NonNullable<ReactNode>;
  isOpen: boolean;
  closePopover: () => void;
  resourceType: MatchedResourceType;
  /** Matches the user can see. */
  matches: readonly MatchedResource[];
  /** Matches the user can't see; they are counted but not listed. */
  hiddenCount?: number;
}

const getHiddenLabel = (
  resourceType: MatchedResourceType,
  hiddenCount: number,
  hasVisibleMatches: boolean
): string => {
  if (resourceType === 'index') {
    return hasVisibleMatches
      ? matchesPopoverStrings.additionalHiddenIndices(hiddenCount)
      : matchesPopoverStrings.hiddenIndices(hiddenCount);
  }

  return hasVisibleMatches
    ? matchesPopoverStrings.additionalHiddenDataStreams(hiddenCount)
    : matchesPopoverStrings.hiddenDataStreams(hiddenCount);
};

const outrankedNameStyles = css`
  text-decoration: line-through;
`;

export const MatchesPopover = ({
  button,
  isOpen,
  closePopover,
  resourceType,
  matches,
  hiddenCount = 0,
}: MatchesPopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'searchBoostMatchesPopoverTitle' });

  const totalCount = matches.length + hiddenCount;
  const outrankedCount = matches.filter(({ outrankedByRuleName }) => outrankedByRuleName).length;
  const title =
    resourceType === 'index'
      ? matchesPopoverStrings.indicesTitle()
      : matchesPopoverStrings.dataStreamsTitle();

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
            ? matchesPopoverStrings.matchesCountWithOutranked(totalCount, outrankedCount)
            : matchesPopoverStrings.matchesCount(totalCount)}
        </EuiText>
      </EuiPopoverTitle>
      <div
        css={css`
          min-width: 248px;
          max-height: 240px;
          overflow-y: auto;
        `}
        data-test-subj="searchBoostMatchesPopoverList"
      >
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
                  content={matchesPopoverStrings.outrankedTooltip(outrankedByRuleName)}
                  iconProps={{ 'data-test-subj': 'searchBoostMatchesPopoverOutrankedIcon' }}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ))}
        {hiddenCount > 0 ? (
          <EuiText size="s" data-test-subj="searchBoostMatchesPopoverHidden">
            <em>{getHiddenLabel(resourceType, hiddenCount, matches.length > 0)}</em>
          </EuiText>
        ) : null}
      </div>
    </EuiPopover>
  );
};
