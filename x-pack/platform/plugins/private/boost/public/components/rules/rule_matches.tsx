/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { SupersedingRule, TargetName } from './target_name';

/** What a default rule applies to: everything of its type that no other rule matches. */
export const getAllUnmatchedLabel = (type: BoostProfileType | undefined): string =>
  type === 'data_streams'
    ? i18n.translate('xpack.boost.ruleMatches.allUnmatchedDataStreams', {
        defaultMessage: 'All unmatched data streams',
      })
    : i18n.translate('xpack.boost.ruleMatches.allUnmatchedIndices', {
        defaultMessage: 'All unmatched indices',
      });

interface RuleMatchesProps {
  patterns: readonly string[];
  type?: BoostProfileType;
  isDefaultRule: boolean;
  coverage: RuleCoverage;
}

/**
 * How many data sources a rule matches, as a link to the list, which shows any that a higher-ranked
 * rule applies to instead. Default rules match whatever no other rule does, which can be most of a
 * project, so they say so rather than count it.
 */
export const RuleMatches = ({ patterns, type, isDefaultRule, coverage }: RuleMatchesProps) => {
  const { euiTheme } = useEuiTheme();

  if (isDefaultRule) {
    return (
      <EuiTextColor color={euiTheme.colors.textDisabled} data-test-subj="boostRuleUnmatched">
        {getAllUnmatchedLabel(type)}
      </EuiTextColor>
    );
  }
  if (coverage.matches === 0) {
    return (
      <EuiTextColor color={euiTheme.colors.textDisabled} data-test-subj="boostRuleNoMatches">
        {formatDataSourceCount(type, 0)}
      </EuiTextColor>
    );
  }
  return <MatchesPopover patterns={patterns} type={type} coverage={coverage} />;
};

type MatchesPopoverProps = Omit<RuleMatchesProps, 'isDefaultRule'>;

const MatchesPopover = ({ patterns, type, coverage }: MatchesPopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const [isOpen, setIsOpen] = useState(false);
  const { matches, matchedNames, appliesTo, supersededBy } = coverage;
  const outranked = matches - appliesTo;

  // The title says how the rule chooses what it matches; the link already says how many.
  const [pattern] = patterns;
  const hasPattern = patterns.length === 1 && pattern.includes('*');
  const title = hasPattern
    ? i18n.translate('xpack.boost.ruleMatches.patternLabel', {
        defaultMessage: 'Using index pattern {pattern}',
        values: { pattern },
      })
    : type === 'data_streams'
    ? i18n.translate('xpack.boost.ruleMatches.selectedDataStreamsTitle', {
        defaultMessage: 'Using selected data streams',
      })
    : i18n.translate('xpack.boost.ruleMatches.selectedIndicesTitle', {
        defaultMessage: 'Using selected indices',
      });

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
        <EuiLink
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          data-test-subj="boostRuleMatches"
        >
          {formatDataSourceCount(type, appliesTo)}
        </EuiLink>
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
        {/* How the matches add up to the count, when higher-ranked rules take some of them. It's
            set in the regular weight, since it's in the title. */}
        {outranked > 0 && (
          <EuiText
            size="xs"
            color="subdued"
            css={{ fontWeight: euiTheme.font.weight.regular }}
            data-test-subj="boostRuleOutranked"
          >
            {i18n.translate('xpack.boost.ruleMatches.outranked', {
              defaultMessage:
                '{matches, plural, one {# match} other {# matches}}, {outranked} outranked',
              values: { matches, outranked },
            })}
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
          {matchedNames.map((name) => {
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
        </ul>
      </div>
    </EuiPopover>
  );
};
