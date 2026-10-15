/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiToolTip,
  useEuiOverflowScroll,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { matchesIndexPattern } from '../../../common/resolution';
import type { BoostProfileType } from '../../../common/types';
import { SupersedingRule, TargetName } from './target_name';

/** A data source an index pattern matches. */
export interface TargetPreview {
  name: string;
  /** A higher-ranked rule that still applies to this target, if any. */
  overriddenBy?: string;
}

type MatchesTab = 'matching' | 'all';

const TABS: readonly MatchesTab[] = ['matching', 'all'];

const TAB_LABELS: Readonly<Record<MatchesTab, Readonly<Record<BoostProfileType, string>>>> = {
  matching: {
    indices: i18n.translate('xpack.boost.patternMatches.matchingIndicesTab', {
      defaultMessage: 'Matching indices',
    }),
    data_streams: i18n.translate('xpack.boost.patternMatches.matchingDataStreamsTab', {
      defaultMessage: 'Matching data streams',
    }),
  },
  all: {
    indices: i18n.translate('xpack.boost.patternMatches.allIndicesTab', {
      defaultMessage: 'All indices',
    }),
    data_streams: i18n.translate('xpack.boost.patternMatches.allDataStreamsTab', {
      defaultMessage: 'All data streams',
    }),
  },
};

const SELECT_PROFILE_LABELS: Readonly<Record<MatchesTab, string>> = {
  matching: i18n.translate('xpack.boost.patternMatches.selectProfileForMatching', {
    defaultMessage: 'Select a boost profile to see matching indices.',
  }),
  all: i18n.translate('xpack.boost.patternMatches.selectProfileForAll', {
    defaultMessage: 'Select a boost profile to see all indices.',
  }),
};

const NO_DATA_SOURCES: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.patternMatches.noIndices', {
    defaultMessage: 'No indices detected',
  }),
  data_streams: i18n.translate('xpack.boost.patternMatches.noDataStreams', {
    defaultMessage: 'No data streams detected',
  }),
};

interface PatternMatchesProps {
  /** The rule's profile type, unknown until a profile is selected. */
  type: BoostProfileType | undefined;
  /** The type the wording follows, indices until a profile sets it. */
  targetType: BoostProfileType;
  pattern: string;
  isPatternValid: boolean;
  /** What the pattern matches. */
  exactMatches: readonly TargetPreview[];
  /** Every data source of the rule's type, in the order they're listed. */
  names: readonly string[];
  /** The panel's tallest height, past which its list scrolls. */
  maxHeight: number;
}

interface ListTitle {
  label: string;
  iconType: string;
}

/**
 * What an index pattern matches, or partly matches until it matches something, beside every data
 * source it could target, like the data view editor's preview.
 */
export const PatternMatches = ({
  type,
  targetType,
  pattern,
  isPatternValid,
  exactMatches,
  names,
  maxHeight,
}: PatternMatchesProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const idPrefix = useGeneratedHtmlId({ prefix: 'patternMatches' });
  const [tab, setTab] = useState<MatchesTab>('matching');
  // What the tabs list depends on the type, so they wait for a profile.
  const selectedTab = type ? tab : 'matching';
  const panelId = `${idPrefix}-panel`;
  const getTabId = (id: MatchesTab) => `${idPrefix}-${id}`;

  // Until the pattern matches something, what contains it, so a remembered part of a name finds it.
  const partialPattern = `*${pattern}*`;
  const partialMatches =
    pattern && isPatternValid && exactMatches.length === 0
      ? names.filter((name) => matchesIndexPattern(partialPattern, name))
      : [];
  // The full list highlights the same names as the matching one.
  const hasExactMatches = exactMatches.length > 0;
  const highlightPattern = hasExactMatches ? pattern : partialPattern;
  const highlightedNames = new Set(
    hasExactMatches ? exactMatches.map(({ name }) => name) : partialMatches
  );

  const rowStyles = { paddingBlock: euiTheme.size.xs };

  const renderEmpty = (message: string) => (
    <EuiText
      size="s"
      color={euiTheme.colors.textDisabled}
      textAlign="center"
      css={{ paddingBlock: euiTheme.size.l, paddingInline: euiTheme.size.s }}
      data-test-subj="boostRulePatternMatchesEmpty"
    >
      <p>{message}</p>
    </EuiText>
  );

  // Titled lists keep their title outside the scrolling area, so it stays in view. The scrolling
  // area is labeled by the title, so the title itself isn't a heading.
  const renderList = (label: string, list: ReactNode, title?: ListTitle) => (
    <>
      {title && (
        <EuiText
          size="xs"
          color="subdued"
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.xs,
            padding: `${euiTheme.size.s} ${euiTheme.size.s} 0`,
          }}
          data-test-subj="boostRulePatternMatchesTitle"
        >
          <EuiIcon type={title.iconType} size="s" aria-hidden={true} />
          {title.label}
        </EuiText>
      )}
      <div
        tabIndex={0}
        role="region"
        aria-label={label}
        css={css`
          ${scrollStyles}
          flex: 1 1 auto;
          min-block-size: 0;
          padding: ${euiTheme.size.s};
          padding-block-start: ${title ? euiTheme.size.xs : euiTheme.size.s};
        `}
      >
        {list}
      </div>
    </>
  );

  const renderMatching = () => {
    if (!type || !pattern) {
      return renderEmpty(
        i18n.translate('xpack.boost.patternMatches.enterPattern', {
          defaultMessage: 'Enter an index pattern to see matches',
        })
      );
    }
    if (hasExactMatches) {
      const title = {
        label: i18n.translate('xpack.boost.patternMatches.exactMatchesTitle', {
          defaultMessage: 'Exact matches',
        }),
        iconType: 'checkCircle',
      };
      return renderList(
        title.label,
        exactMatches.map(({ name, overriddenBy }) => (
          <EuiFlexGroup
            key={name}
            gutterSize="s"
            justifyContent="spaceBetween"
            alignItems="center"
            responsive={false}
            css={rowStyles}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <TargetName name={name} pattern={pattern} supersededBy={overriddenBy} />
              </EuiText>
            </EuiFlexItem>
            {overriddenBy && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <SupersedingRule rule={overriddenBy} />
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )),
        title
      );
    }
    if (partialMatches.length > 0) {
      const title = {
        label: i18n.translate('xpack.boost.patternMatches.partialMatchesTitle', {
          defaultMessage: 'Partial matches',
        }),
        iconType: 'partial',
      };
      // Subdued, and without what ranks higher, since the rule doesn't apply to these yet.
      return renderList(
        title.label,
        <EuiText size="s" color="subdued">
          {partialMatches.map((name) => (
            <div key={name} css={rowStyles} data-test-subj="boostRulePartialMatch">
              <TargetName name={name} pattern={partialPattern} />
            </div>
          ))}
        </EuiText>,
        title
      );
    }
    return renderEmpty(
      i18n.translate('xpack.boost.patternMatches.noMatches', {
        defaultMessage: 'No matches detected',
      })
    );
  };

  const renderAll = () =>
    names.length > 0
      ? renderList(
          TAB_LABELS.all[targetType],
          <EuiText size="s">
            {names.map((name) => (
              <div key={name} css={rowStyles} data-test-subj="boostRuleAvailableTarget">
                <TargetName
                  name={name}
                  pattern={highlightedNames.has(name) ? highlightPattern : undefined}
                />
              </div>
            ))}
          </EuiText>
        )
      : renderEmpty(NO_DATA_SOURCES[targetType]);

  return (
    <EuiPanel
      color="subdued"
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={{ display: 'flex', flexDirection: 'column', maxBlockSize: maxHeight }}
      data-test-subj="boostRulePatternMatches"
    >
      <EuiTabs size="s" bottomBorder={false} css={{ paddingInline: euiTheme.size.s }}>
        {TABS.map((id) => {
          const isDisabled = !type;
          const tabButton = (
            <EuiTab
              key={id}
              id={getTabId(id)}
              aria-controls={panelId}
              isSelected={selectedTab === id}
              disabled={isDisabled}
              onClick={() => setTab(id)}
              data-test-subj={id === 'all' ? 'boostRuleAllTab' : 'boostRuleMatchingTab'}
            >
              {TAB_LABELS[id][targetType]}
            </EuiTab>
          );
          return isDisabled ? (
            <EuiToolTip key={id} content={SELECT_PROFILE_LABELS[id]}>
              {tabButton}
            </EuiToolTip>
          ) : (
            tabButton
          );
        })}
      </EuiTabs>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={getTabId(selectedTab)}
        css={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minBlockSize: 0 }}
      >
        {selectedTab === 'matching' ? renderMatching() : renderAll()}
      </div>
    </EuiPanel>
  );
};
