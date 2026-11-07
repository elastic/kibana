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
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiTextColor,
  useEuiOverflowScroll,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleCoverage } from '../../../common/resolution';
import type { BoostProfileType } from '../../../common/types';
import { formatDataSourceCount } from '../format';
import { formatHiddenTargets } from '../hidden_data';
import { SupersedingRuleTip, TargetName } from './target_name';

interface RuleMatchesProps {
  type?: BoostProfileType;
  coverage: RuleCoverage;
  /** The names of hidden indices and data streams, which the list leaves out, ending with how many. */
  hiddenNames?: ReadonlySet<string>;
}

const formatMatchCount = (matches: number, outranked: number): string =>
  outranked > 0
    ? i18n.translate('xpack.boost.ruleMatches.outranked', {
        defaultMessage: '{matches, plural, one {# match} other {# matches}}, {outranked} outranked',
        values: { matches, outranked },
      })
    : i18n.translate('xpack.boost.ruleMatches.matchCount', {
        defaultMessage: '{matches, plural, one {# match} other {# matches}}',
        values: { matches },
      });

/**
 * How many data sources a rule applies to, as a link to the list of what it matches, which shows
 * any that a higher-ranked rule applies to instead.
 */
export const RuleMatches = ({ type, coverage, hiddenNames }: RuleMatchesProps) => {
  const { euiTheme } = useEuiTheme();

  if (coverage.matches === 0) {
    return (
      <EuiTextColor color={euiTheme.colors.textDisabled} data-test-subj="boostRuleNoMatches">
        {formatDataSourceCount(type, 0)}
      </EuiTextColor>
    );
  }
  return <MatchesPopover type={type} coverage={coverage} hiddenNames={hiddenNames} />;
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

  // The rule's targets are beside the link, so the title just says what the list holds, and how
  // many of them higher-ranked rules take.
  const title =
    type === 'data_streams'
      ? i18n.translate('xpack.boost.ruleMatches.dataStreamsTitle', {
          defaultMessage: 'Matching data streams',
        })
      : i18n.translate('xpack.boost.ruleMatches.indicesTitle', {
          defaultMessage: 'Matching indices',
        });
  const count = formatMatchCount(matches, outranked);
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
        {title}
        {/* How many the rule matches, and how many of those higher-ranked rules take. It's set in
            the regular weight, since it's in the title. */}
        <EuiText
          size="xs"
          color="subdued"
          css={{ fontWeight: euiTheme.font.weight.regular }}
          data-test-subj="boostRuleMatchCount"
        >
          {count}
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
              // A name, followed by an icon naming any higher-ranked rule in its tooltip. The rule's
              // details list its matches with the rules that outrank it for them.
              <li key={name} css={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.xs }}>
                <TargetName name={name} supersededBy={supersedingRule} />
                {supersedingRule && <SupersedingRuleTip rule={supersedingRule} />}
              </li>
            );
          })}
          {hiddenCount > 0 && (
            // In italics, setting the count apart from the names.
            <li css={{ fontStyle: 'italic' }} data-test-subj="boostRuleMatchesMoreHidden">
              {formatHiddenTargets(type, hiddenCount, shownNames.length > 0)}
            </li>
          )}
        </ul>
      </div>
    </EuiPopover>
  );
};
