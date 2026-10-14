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
  EuiIconTip,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useEuiOverflowScroll,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleCoverage } from '../../../common/resolution';
import type { BoostProfileType } from '../../../common/types';
import { formatDataSourceCount } from '../format';
import { SUPERSEDING_ICON, SupersedingRule, TargetName } from './target_name';

interface AppliesToProps {
  patterns: readonly string[];
  type?: BoostProfileType;
  isDefaultRule: boolean;
  coverage: RuleCoverage;
}

const getSupersededDescription = (type: BoostProfileType | undefined, count: number) =>
  type === 'data_streams'
    ? i18n.translate('xpack.boost.appliesTo.supersededDataStreams', {
        defaultMessage:
          '{count, plural, one {# data stream this rule matches uses} other {# data streams this rule matches use}} a higher-ranked rule instead.',
        values: { count },
      })
    : i18n.translate('xpack.boost.appliesTo.supersededIndices', {
        defaultMessage:
          '{count, plural, one {# index this rule matches uses} other {# indices this rule matches use}} a higher-ranked rule instead.',
        values: { count },
      });

const getMatchesTitle = (type: BoostProfileType | undefined, appliesTo: number, matches: number) =>
  type === 'data_streams'
    ? i18n.translate('xpack.boost.appliesTo.dataStreamsTitle', {
        defaultMessage:
          'Applies to {appliesTo} of {matches, plural, one {# matching data stream} other {# matching data streams}}',
        values: { appliesTo, matches },
      })
    : i18n.translate('xpack.boost.appliesTo.indicesTitle', {
        defaultMessage:
          'Applies to {appliesTo} of {matches, plural, one {# matching index} other {# matching indices}}',
        values: { appliesTo, matches },
      });

/**
 * What a rule applies to, as a link to everything it matches, noting any that a higher-ranked rule
 * takes. Default rules apply to whatever no other rule matches, which can be most of a project, so
 * they say so rather than count it.
 */
export const AppliesTo = ({ patterns, type, isDefaultRule, coverage }: AppliesToProps) => {
  const { euiTheme } = useEuiTheme();
  const { matches, supersededBy } = coverage;

  if (isDefaultRule) {
    return (
      <>
        {type === 'data_streams'
          ? i18n.translate('xpack.boost.appliesTo.allUnmatchedDataStreams', {
              defaultMessage: 'All unmatched data streams',
            })
          : i18n.translate('xpack.boost.appliesTo.allUnmatchedIndices', {
              defaultMessage: 'All unmatched indices',
            })}
      </>
    );
  }
  if (matches === 0) {
    return <>{formatDataSourceCount(type, 0)}</>;
  }

  const description = getSupersededDescription(type, supersededBy.size);
  return (
    <span css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.xs }}>
      <MatchesPopover patterns={patterns} type={type} coverage={coverage} />
      {supersededBy.size > 0 && (
        <EuiIconTip
          type={SUPERSEDING_ICON}
          color="subdued"
          display="flex"
          content={description}
          aria-label={description}
          iconProps={{ 'data-test-subj': 'boostRuleSuperseded' }}
        />
      )}
    </span>
  );
};

type MatchesPopoverProps = Omit<AppliesToProps, 'isDefaultRule'>;

const MatchesPopover = ({ patterns, type, coverage }: MatchesPopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const [isOpen, setIsOpen] = useState(false);
  const { appliesTo, matches, matchedNames, supersededBy } = coverage;

  const title = getMatchesTitle(type, appliesTo, matches);
  // A rule with a pattern shows it, since the list is what the pattern matches today.
  const [pattern] = patterns;
  const hasPattern = patterns.length === 1 && pattern.includes('*');

  return (
    <EuiPopover
      aria-label={title}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      // The list sets its own padding, inside its scroll area, so its scroll fade covers only that.
      panelPaddingSize="none"
      button={
        <EuiLink
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          data-test-subj="boostRuleAppliesTo"
        >
          {formatDataSourceCount(type, appliesTo)}
        </EuiLink>
      }
    >
      <EuiPopoverTitle paddingSize="s">
        {title}
        {hasPattern && (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.boost.appliesTo.patternLabel', {
              defaultMessage: 'Pattern',
            })}{' '}
            <EuiCode>{pattern}</EuiCode>
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
              // A flex row, so each name's padded background takes up space in the list instead of
              // overlapping the next one, with any higher-ranked rule on the right.
              <li
                key={name}
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: euiTheme.size.m,
                }}
              >
                <TargetName name={name} supersededBy={supersedingRule} />
                {supersedingRule && (
                  <EuiText size="xs" color="subdued">
                    <SupersedingRule rule={supersedingRule} />
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
