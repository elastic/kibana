/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiCode,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiTextColor,
  useEuiOverflowScroll,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleCoverage } from '../../../common/resolution';
import type { BoostProfileType } from '../../../common/types';
import { formatDataSourceCount } from '../format';
import { formatMoreHidden } from '../hidden_data';
import { SupersedingRule, TargetName } from './target_name';

interface RuleMatchesProps {
  patterns: readonly string[];
  type?: BoostProfileType;
  coverage: RuleCoverage;
  /** The names of hidden indices and data streams, which the list leaves out, ending with how many. */
  hiddenNames?: ReadonlySet<string>;
}

// Whether the rule selects one target or several.
const SELECTED_TITLES: Readonly<Record<BoostProfileType, { one: string; other: string }>> = {
  indices: {
    one: i18n.translate('xpack.boost.ruleMatches.selectedIndexTitle', {
      defaultMessage: 'Using selected index',
    }),
    other: i18n.translate('xpack.boost.ruleMatches.selectedIndicesTitle', {
      defaultMessage: 'Using selected indices',
    }),
  },
  data_streams: {
    one: i18n.translate('xpack.boost.ruleMatches.selectedDataStreamTitle', {
      defaultMessage: 'Using selected data stream',
    }),
    other: i18n.translate('xpack.boost.ruleMatches.selectedDataStreamsTitle', {
      defaultMessage: 'Using selected data streams',
    }),
  },
};

/**
 * How many data sources a rule applies to, as a link to the list of what it matches, which shows
 * any that a higher-ranked rule applies to instead.
 */
export const RuleMatches = ({ patterns, type, coverage, hiddenNames }: RuleMatchesProps) => {
  const { euiTheme } = useEuiTheme();

  if (coverage.matches === 0) {
    return (
      <EuiTextColor color={euiTheme.colors.textDisabled} data-test-subj="boostRuleNoMatches">
        {formatDataSourceCount(type, 0)}
      </EuiTextColor>
    );
  }
  return (
    <MatchesPopover patterns={patterns} type={type} coverage={coverage} hiddenNames={hiddenNames} />
  );
};

interface MatchesPopoverProps extends RuleMatchesProps {
  /** The button that opens the list, in place of a link counting what the rule applies to. */
  renderButton?: (button: { onClick: () => void; isOpen: boolean }) => ReactElement;
}

/**
 * The list of what a rule matches, opened from a count of what it applies to, which notes what
 * higher-ranked rules take instead. Like the other lists, it leaves hidden matches out, ending with
 * how many, though the counts include them.
 */
export const MatchesPopover = ({
  patterns,
  type,
  coverage,
  hiddenNames,
  renderButton,
}: MatchesPopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const [isOpen, setIsOpen] = useState(false);
  const { matches, matchedNames, appliesTo, supersededBy } = coverage;
  const outranked = matches - appliesTo;
  const toggle = () => setIsOpen(!isOpen);

  // The title says how the rule chooses what it matches, such as a default rule's `*`; the link
  // already says how many.
  const [pattern] = patterns;
  const hasPattern = patterns.length === 1 && pattern.includes('*');
  const title = hasPattern
    ? i18n.translate('xpack.boost.ruleMatches.patternLabel', {
        defaultMessage: 'Using index pattern {pattern}',
        values: { pattern },
      })
    : SELECTED_TITLES[type ?? 'indices'][patterns.length === 1 ? 'one' : 'other'];
  const shownNames = matchedNames.filter((name) => !hiddenNames?.has(name));
  const hiddenCount = matchedNames.length - shownNames.length;

  return (
    <EuiPopover
      aria-label={title}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      // The list sets its own padding, inside its scroll area, so its scroll fade covers only that.
      panelPaddingSize="none"
      button={
        // What the rule applies to. The list shows everything it matches, with what higher-ranked
        // rules take struck through.
        renderButton?.({ onClick: toggle, isOpen }) ?? (
          <EuiLink onClick={toggle} aria-expanded={isOpen} data-test-subj="boostRuleMatches">
            {formatDataSourceCount(type, appliesTo)}
          </EuiLink>
        )
      }
    >
      <EuiPopoverTitle paddingSize="s">
        {hasPattern ? (
          <FormattedMessage
            id="xpack.boost.ruleMatches.patternTitle"
            defaultMessage="Using index pattern {pattern}"
            values={{ pattern: <EuiCode>{pattern}</EuiCode> }}
          />
        ) : (
          title
        )}
        {/* How many the rule matches, and how many of those higher-ranked rules take. It's set in
            the regular weight, since it's in the title. */}
        <EuiText
          size="xs"
          color="subdued"
          css={{ fontWeight: euiTheme.font.weight.regular }}
          data-test-subj="boostRuleMatchCount"
        >
          {outranked > 0
            ? i18n.translate('xpack.boost.ruleMatches.outranked', {
                defaultMessage:
                  '{matches, plural, one {# match} other {# matches}}, {outranked} outranked',
                values: { matches, outranked },
              })
            : i18n.translate('xpack.boost.ruleMatches.matchCount', {
                defaultMessage: '{matches, plural, one {# match} other {# matches}}',
                values: { matches },
              })}
        </EuiText>
      </EuiPopoverTitle>
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
          {shownNames.map((name) => {
            const supersedingRule = supersededBy.get(name);
            return (
              // A row with any higher-ranked rule on the right.
              <li
                key={name}
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: euiTheme.size.l,
                }}
              >
                <TargetName name={name} supersededBy={supersedingRule} />
                {supersedingRule && (
                  <EuiText size="xs" color="subdued">
                    <SupersedingRule rule={supersedingRule} isLinked />
                  </EuiText>
                )}
              </li>
            );
          })}
          {hiddenCount > 0 && (
            <li
              css={{ color: euiTheme.colors.textDisabled }}
              data-test-subj="boostRuleMatchesMoreHidden"
            >
              {formatMoreHidden(type, hiddenCount)}
            </li>
          )}
        </ul>
      </div>
    </EuiPopover>
  );
};
