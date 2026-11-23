/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { Status } from '@kbn/cases-components';
import type { MergePreviewCase } from '../../../../common/types/api';
import { useCaseViewNavigation } from '../../../common/navigation/hooks';
import { SeverityHealth } from '../../severity/config';
import * as i18n from './translations';

const MAX_TAGS = 5;
/** The card's content width; the popover adds its own padding. */
const CARD_WIDTH = 328;

/** How a case is named in the merge: its number, or its title until it has one. */
export const getCaseRef = ({
  incrementalId,
  title,
}: Pick<MergePreviewCase, 'incrementalId' | 'title'>): string =>
  incrementalId != null ? `#${incrementalId}` : title;

/** A case's opener or closer by display name, falling back to the username or email. */
const getUserName = (user: MergePreviewCase['createdBy'] | null): string | undefined =>
  user?.full_name || user?.username || user?.email || undefined;

const MetaLine: React.FC<{
  icon: string;
  iconLabel?: string;
  testSubj: string;
  children: React.ReactNode;
}> = ({ icon, iconLabel, testSubj, children }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon
        type={icon}
        size="s"
        color="subdued"
        {...(iconLabel != null ? { 'aria-label': iconLabel } : { 'aria-hidden': true })}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiText size="xs" color="subdued" data-test-subj={`merge-case-hover-card-${testSubj}`}>
        {children}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
MetaLine.displayName = 'MetaLine';

/** What a case number's card shows: enough to recognise the case without opening it. */
export const CaseHoverCard: React.FC<{ theCase: MergePreviewCase }> = ({ theCase }) => {
  const { euiTheme } = useEuiTheme();
  const { getCaseViewUrl } = useCaseViewNavigation();
  const openedBy = getUserName(theCase.createdBy);
  const closedBy = getUserName(theCase.closedBy);
  const visibleTags = theCase.tags.slice(0, MAX_TAGS);
  const hiddenTags = theCase.tags.length - visibleTags.length;

  return (
    <div
      css={css`
        width: ${CARD_WIDTH}px;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `}
      data-test-subj={`merge-case-hover-card-${theCase.id}`}
    >
      {/* The number is already on the chip being hovered, so the card leads with the title. */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 0;
          `}
        >
          <EuiTitle size="xxs">
            <h4 data-test-subj="merge-case-hover-card-title">
              {/* A new tab, so the merge in progress stays put. */}
              <EuiLink href={getCaseViewUrl({ detailName: theCase.id })} target="_blank">
                {theCase.title}
              </EuiLink>
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Status status={theCase.status} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SeverityHealth severity={theCase.severity} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {theCase.description.trim().length > 0 ? (
        <EuiText
          size="s"
          color="subdued"
          css={css`
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            white-space: pre-line;
          `}
          data-test-subj="merge-case-hover-card-description"
        >
          {theCase.description}
        </EuiText>
      ) : null}
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
          padding-top: ${euiTheme.size.s};
          border-top: ${euiTheme.border.thin};
        `}
      >
        <MetaLine icon="clock" testSubj="opened">
          {openedBy != null ? (
            <FormattedMessage
              id="xpack.cases.mergeCases.differences.hover.openedBy"
              defaultMessage="Opened {when} by {name}"
              values={{
                when: <FormattedRelative value={new Date(theCase.createdAt)} />,
                name: openedBy,
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.cases.mergeCases.differences.hover.openedAt"
              defaultMessage="Opened {when}"
              values={{ when: <FormattedRelative value={new Date(theCase.createdAt)} /> }}
            />
          )}
        </MetaLine>
        {theCase.closedAt != null ? (
          <MetaLine icon="checkCircle" testSubj="closed">
            {closedBy != null ? (
              <FormattedMessage
                id="xpack.cases.mergeCases.differences.hover.closedBy"
                defaultMessage="Closed {when} by {name}"
                values={{
                  when: <FormattedRelative value={new Date(theCase.closedAt)} />,
                  name: closedBy,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.cases.mergeCases.differences.hover.closedAt"
                defaultMessage="Closed {when}"
                values={{ when: <FormattedRelative value={new Date(theCase.closedAt)} /> }}
              />
            )}
          </MetaLine>
        ) : null}
        {theCase.templateName != null ? (
          <MetaLine icon="document" iconLabel={i18n.HOVER_TEMPLATE} testSubj="template">
            {theCase.templateName}
          </MetaLine>
        ) : null}
      </div>
      {visibleTags.length > 0 ? (
        <EuiFlexGroup
          gutterSize="xs"
          responsive={false}
          wrap
          aria-label={i18n.HOVER_TAGS}
          data-test-subj="merge-case-hover-card-tags"
        >
          {visibleTags.map((tag) => (
            <EuiFlexItem grow={false} key={tag}>
              <EuiBadge>{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
          {hiddenTags > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiBadge>{i18n.HOVER_MORE_TAGS(hiddenTags)}</EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ) : null}
    </div>
  );
};
CaseHoverCard.displayName = 'CaseHoverCard';
