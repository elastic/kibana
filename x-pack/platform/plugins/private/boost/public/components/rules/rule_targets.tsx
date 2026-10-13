/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiCode,
  EuiFieldSearch,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  useEuiOverflowScroll,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../../../common/types';
import { formatDataSourceCount } from '../format';

interface RuleTargetsProps {
  patterns: readonly string[];
  /** The rule's profile type, which names the targets in the full list. */
  type?: BoostProfileType;
}

// Names shown before the rest collapse into "+N more".
const VISIBLE_PATTERNS = 2;
// Longer lists get a search field.
const SEARCHABLE_FROM = 10;

/** A rule's pattern, or the first of its picked names with the rest in a searchable list. */
export const RuleTargets = ({ patterns, type }: RuleTargetsProps) => {
  const hiddenCount = patterns.length - VISIBLE_PATTERNS;

  // Inline text in one span, since table cells are flex containers that would stretch each code
  // element into a flex item.
  return (
    <span>
      {patterns.slice(0, VISIBLE_PATTERNS).map((pattern, index) => (
        <Fragment key={pattern}>
          {index > 0 && ' '}
          <EuiCode>{pattern}</EuiCode>
        </Fragment>
      ))}
      {hiddenCount > 0 && (
        <>
          {' '}
          <AllPatternsPopover patterns={patterns} type={type} hiddenCount={hiddenCount} />
        </>
      )}
    </span>
  );
};

interface AllPatternsPopoverProps extends RuleTargetsProps {
  hiddenCount: number;
}

const AllPatternsPopover = ({ patterns, type, hiddenCount }: AllPatternsPopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const title = formatDataSourceCount(type, patterns.length);
  const visiblePatterns = patterns.filter((pattern) =>
    pattern.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <EuiPopover
      aria-label={title}
      isOpen={isOpen}
      closePopover={() => {
        setIsOpen(false);
        setQuery('');
      }}
      anchorPosition="downLeft"
      button={
        <EuiLink onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
          {i18n.translate('xpack.boost.ruleTargets.moreButton', {
            defaultMessage: '+{count} more',
            values: { count: hiddenCount },
          })}
        </EuiLink>
      }
    >
      <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>
      {patterns.length >= SEARCHABLE_FROM && (
        <>
          <EuiFieldSearch
            compressed
            fullWidth
            value={query}
            onChange={({ target: { value } }) => setQuery(value)}
            placeholder={i18n.translate('xpack.boost.ruleTargets.searchPlaceholder', {
              defaultMessage: 'Search',
            })}
            aria-label={i18n.translate('xpack.boost.ruleTargets.searchLabel', {
              defaultMessage: 'Search {title}',
              values: { title },
            })}
          />
          <EuiSpacer size="s" />
        </>
      )}
      <div
        tabIndex={0}
        role="region"
        aria-label={title}
        css={css`
          ${scrollStyles}
          max-block-size: ${euiTheme.base * 15}px;
          min-inline-size: ${euiTheme.base * 15}px;
        `}
      >
        {visiblePatterns.length > 0 ? (
          <ul css={{ display: 'grid', gap: euiTheme.size.xs }}>
            {visiblePatterns.map((pattern) => (
              <li key={pattern}>
                <EuiCode>{pattern}</EuiCode>
              </li>
            ))}
          </ul>
        ) : (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.boost.ruleTargets.noMatches', {
                defaultMessage: 'No matches',
              })}
            </p>
          </EuiText>
        )}
      </div>
    </EuiPopover>
  );
};
