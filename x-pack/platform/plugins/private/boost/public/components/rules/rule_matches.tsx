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
import type { BoostProfileType, RuleTargetMode } from '../../../common/types';
import { formatDataSourceCount } from '../format';
import { useAllowsMultipleTargets } from '../../prototype/prototype_settings';
import { formatHiddenTargets } from '../hidden_data';
import { NotFoundBadge } from './not_found_badge';
import { SupersedingRuleTip, TargetName } from './target_name';

interface RuleMatchesProps {
  patterns: readonly string[];
  /** Whether the rule's targets were typed as a pattern or selected, which the title says. */
  mode: RuleTargetMode;
  type?: BoostProfileType;
  coverage: RuleCoverage;
  /** The names the rule selected that no index or data stream has, which the list marks. */
  missingNames?: readonly string[];
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

const formatSelectedCount = (selected: number, outranked: number, notFound: number): string => {
  if (notFound > 0) {
    return outranked > 0
      ? i18n.translate('xpack.boost.ruleMatches.selectedOutrankedNotFound', {
          defaultMessage: '{selected} selected, {outranked} outranked, {notFound} not found',
          values: { selected, outranked, notFound },
        })
      : i18n.translate('xpack.boost.ruleMatches.selectedNotFound', {
          defaultMessage: '{selected} selected, {notFound} not found',
          values: { selected, notFound },
        });
  }
  return outranked > 0
    ? i18n.translate('xpack.boost.ruleMatches.selectedOutranked', {
        defaultMessage: '{selected} selected, {outranked} outranked',
        values: { selected, outranked },
      })
    : i18n.translate('xpack.boost.ruleMatches.selectedCount', {
        defaultMessage: '{selected} selected',
        values: { selected },
      });
};

/**
 * How many data sources a rule applies to, as a link to the list of what it matches, which shows
 * any that a higher-ranked rule applies to instead, and any it selected that no longer exist.
 */
export const RuleMatches = (props: RuleMatchesProps) => {
  const { euiTheme } = useEuiTheme();
  const { type, coverage, missingNames = [] } = props;

  if (coverage.matches === 0 && missingNames.length === 0) {
    return (
      <EuiTextColor color={euiTheme.colors.textDisabled} data-test-subj="boostRuleNoMatches">
        {formatDataSourceCount(type, 0)}
      </EuiTextColor>
    );
  }
  return <MatchesPopover {...props} />;
};

interface MatchesPopoverProps extends RuleMatchesProps {
  /** The button that opens the list, in place of a link counting what the rule applies to. */
  renderButton?: (button: { onClick: () => void; isOpen: boolean }) => ReactElement;
}

/**
 * The list of what a rule matches, opened from a count of what it applies to, which notes what
 * higher-ranked rules take instead, and marks what the rule selected that no longer exists. Like
 * the other lists, it leaves hidden matches out, ending with how many, though the counts include
 * them.
 */
export const MatchesPopover = ({
  patterns,
  mode,
  type,
  coverage,
  missingNames = [],
  hiddenNames,
  renderButton,
}: MatchesPopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const allowsMultipleTargets = useAllowsMultipleTargets();
  const [isOpen, setIsOpen] = useState(false);
  const { matches, matchedNames, appliesTo, supersededBy } = coverage;
  const outranked = matches - appliesTo;
  const toggle = () => setIsOpen(!isOpen);

  // The title says how the rule chooses what it matches, such as a default rule's `*`; the link
  // already says how many.
  const [pattern] = patterns;
  const hasPattern = mode === 'pattern';
  const title = hasPattern
    ? i18n.translate('xpack.boost.ruleMatches.patternLabel', {
        defaultMessage: 'Using index pattern {pattern}',
        values: { pattern },
      })
    : SELECTED_TITLES[type ?? 'indices'][patterns.length === 1 ? 'one' : 'other'];
  const count = hasPattern
    ? formatMatchCount(matches, outranked)
    : allowsMultipleTargets
    ? formatSelectedCount(matches + missingNames.length, outranked, missingNames.length)
    : undefined;
  const shownNames = matchedNames.filter((name) => !hiddenNames?.has(name));
  const hiddenCount = matchedNames.length - shownNames.length;
  // What the rule selected that no longer exists sorts in among the rest, as in the rule's form.
  const missing = new Set(missingNames);
  const listedNames = [...shownNames, ...missingNames].sort((a, b) => a.localeCompare(b));

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
            the regular weight, since it's in the title. Selected targets leave it out while a rule
            selects only one, since it would always be 1. */}
        {count && (
          <EuiText
            size="xs"
            color="subdued"
            css={{ fontWeight: euiTheme.font.weight.regular }}
            data-test-subj="boostRuleMatchCount"
          >
            {count}
          </EuiText>
        )}
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
          {listedNames.map((name) => {
            if (missing.has(name)) {
              // A name the rule keeps, which applies again to an index or data stream created with
              // it, marked as not found.
              return (
                <li
                  key={name}
                  css={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.s }}
                  data-test-subj="boostRuleMatchesNotFound"
                >
                  <TargetName name={name} />
                  <NotFoundBadge names={[name]} type={type} />
                </li>
              );
            }
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
              {formatHiddenTargets(type, hiddenCount, listedNames.length > 0)}
            </li>
          )}
        </ul>
      </div>
    </EuiPopover>
  );
};
