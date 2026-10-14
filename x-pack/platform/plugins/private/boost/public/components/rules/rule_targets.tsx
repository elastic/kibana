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
  EuiNotificationBadge,
  EuiPopover,
  EuiPopoverTitle,
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

// Names shown before the rest collapse into a "+N" badge.
const VISIBLE_PATTERNS = 2;

/** A rule's pattern, or the first of its picked names with the rest in a scrollable list. */
export const RuleTargets = ({ patterns, type }: RuleTargetsProps) => {
  const hiddenCount = patterns.length - VISIBLE_PATTERNS;

  // Inline text in one span, since table cells are flex containers that would stretch each code
  // element into a flex item.
  return (
    <span>
      {patterns.slice(0, VISIBLE_PATTERNS).map((pattern, index) => (
        <Fragment key={pattern}>
          {index > 0 && ' '}
          {/* Names wrap between each other, not at their hyphens. */}
          <EuiCode css={{ whiteSpace: 'nowrap' }}>{pattern}</EuiCode>
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

  const title = formatDataSourceCount(type, patterns.length);

  return (
    <EuiPopover
      aria-label={title}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      // The list sets its own padding, inside its scroll area, so its scroll fade covers only that.
      panelPaddingSize="none"
      button={
        // The notification badge isn't interactive, so a plain button makes it one. In the popover's
        // inline anchor, aligning it to the top of the text centers it on the names beside it.
        <button
          type="button"
          css={{ display: 'inline-flex', verticalAlign: 'text-top' }}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={i18n.translate('xpack.boost.ruleTargets.showAllButtonLabel', {
            defaultMessage: 'Show all {targets}',
            values: { targets: title },
          })}
          data-test-subj="boostRuleTargetsMore"
        >
          {/* EUI has no hover style for notification badges, and sets a default cursor on them. */}
          <EuiNotificationBadge color="subdued" css={{ cursor: 'pointer' }}>
            {i18n.translate('xpack.boost.ruleTargets.moreBadge', {
              defaultMessage: '+{count}',
              values: { count: hiddenCount },
            })}
          </EuiNotificationBadge>
        </button>
      }
    >
      <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>
      <div
        tabIndex={0}
        role="region"
        aria-label={title}
        css={css`
          ${scrollStyles}
          max-block-size: ${euiTheme.base * 15}px;
          min-inline-size: ${euiTheme.base * 15}px;
          /* As tall as the scroll fade, so the first and last names stay clear of it until the list
             scrolls. */
          padding: ${euiTheme.size.s};
        `}
      >
        <ul css={{ display: 'grid', gap: euiTheme.size.s }}>
          {patterns.map((pattern) => (
            // A flex item, so each name's padded background takes up space in the list instead of
            // overlapping the next one.
            <li key={pattern} css={{ display: 'flex' }}>
              <EuiCode>{pattern}</EuiCode>
            </li>
          ))}
        </ul>
      </div>
    </EuiPopover>
  );
};
