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
  EuiNotificationBadge,
  EuiPanel,
  EuiTab,
  EuiTabs,
  EuiText,
  useEuiOverflowScroll,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../../../common/types';
import { SupersedingRule, TargetName } from './target_name';

/** A data source an index pattern matches. */
export interface TargetPreview {
  name: string;
  /** A higher-ranked rule that still applies to this target, if any. */
  overriddenBy?: string;
}

/**
 * What partially matches a pattern until it matches something: whatever contains it, so a
 * remembered part of a name finds it.
 */
export const getPartialPattern = (pattern: string) => `*${pattern}*`;

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

const NO_DATA_SOURCES: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.patternMatches.noIndices', {
    defaultMessage: 'No indices detected',
  }),
  data_streams: i18n.translate('xpack.boost.patternMatches.noDataStreams', {
    defaultMessage: 'No data streams detected',
  }),
};

type MatchKind = 'exact' | 'partial';

// Each row shows whether the pattern matches it exactly or partly.
const MATCH_ICONS: Readonly<
  Record<MatchKind, { iconType: string; color: 'success' | 'subdued'; label: string }>
> = {
  exact: {
    iconType: 'checkCircleFill',
    color: 'success',
    label: i18n.translate('xpack.boost.patternMatches.exactMatchIcon', {
      defaultMessage: 'Exact match',
    }),
  },
  partial: {
    iconType: 'partial',
    color: 'subdued',
    label: i18n.translate('xpack.boost.patternMatches.partialMatchIcon', {
      defaultMessage: 'Partial match',
    }),
  },
};

interface MatchIconProps {
  /** How the name matches the pattern, or nothing when it doesn't. */
  match?: MatchKind;
  /** Whether a higher-ranked rule keeps the match, so its icon is subdued like its name. */
  isSuperseded?: boolean;
  /** Whether screen readers hear what the icon means, which a list's label may already say. */
  isLabeled: boolean;
}

/** An exact or partial match's icon, or a blank space as wide, so names line up. */
const MatchIcon = ({ match, isSuperseded = false, isLabeled }: MatchIconProps) => {
  if (!match) {
    return <EuiIcon type="empty" size="m" aria-hidden={true} />;
  }
  const { iconType, label } = MATCH_ICONS[match];
  const color = isSuperseded ? 'subdued' : MATCH_ICONS[match].color;
  return isLabeled ? (
    <EuiIcon type={iconType} color={color} size="m" title={label} />
  ) : (
    <EuiIcon type={iconType} color={color} size="m" aria-hidden={true} />
  );
};

interface PatternMatchesProps {
  /** The rule's profile type, unknown until a profile is selected. */
  type: BoostProfileType | undefined;
  /** The type the wording follows, indices until a profile sets it. */
  targetType: BoostProfileType;
  pattern: string;
  /** What the pattern matches. */
  exactMatches: readonly TargetPreview[];
  /** What contains the pattern, until it matches something. */
  partialMatches: readonly TargetPreview[];
  /** Every data source of the rule's type, in the order they're listed. */
  names: readonly string[];
  /** The panel's tallest height, past which its list scrolls. */
  maxHeight: number;
}

/**
 * What an index pattern matches, or partly matches until it matches something, beside every data
 * source it could target, like the data view editor's preview.
 */
export const PatternMatches = ({
  type,
  targetType,
  pattern,
  exactMatches,
  partialMatches,
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

  const partialPattern = getPartialPattern(pattern);
  // The full list highlights the same names as the matching one.
  const hasExactMatches = exactMatches.length > 0;
  const highlightPattern = hasExactMatches ? pattern : partialPattern;
  const highlightedNames = new Set(
    (hasExactMatches ? exactMatches : partialMatches).map(({ name }) => name)
  );
  const matchKind: MatchKind = hasExactMatches ? 'exact' : 'partial';
  // How many each tab lists: what matches, exactly or else partly, and every data source.
  const counts: Readonly<Record<MatchesTab, number>> = {
    matching: !type || !pattern ? 0 : highlightedNames.size,
    all: names.length,
  };

  const renderEmpty = (message: string) => (
    <EuiText
      size="s"
      color={euiTheme.colors.textDisabled}
      textAlign="center"
      // 24px from the tabs and the panel's bottom edge, after the space around the tab's content.
      css={{ paddingBlock: euiTheme.size.base }}
      data-test-subj="boostRulePatternMatchesEmpty"
    >
      <p>{message}</p>
    </EuiText>
  );

  // The scrolling area keeps 8px of padding, which its scroll mask fades.
  const renderList = (label: string, rows: ReactNode, isSubdued = false) => (
    <EuiText
      size="s"
      color={isSubdued ? 'subdued' : undefined}
      tabIndex={0}
      role="region"
      aria-label={label}
      css={css`
        ${scrollStyles}
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        gap: ${euiTheme.size.m};
        min-block-size: 0;
        padding-block: ${euiTheme.size.s};
      `}
    >
      {rows}
    </EuiText>
  );

  // A name after its match icon.
  const renderName = (
    name: ReactNode,
    match: MatchKind | undefined,
    isLabeled: boolean,
    isSuperseded = false
  ) => (
    <span css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.s }}>
      <MatchIcon match={match} isSuperseded={isSuperseded} isLabeled={isLabeled} />
      {name}
    </span>
  );

  // Each target, struck through with the rule that keeps it when a higher-ranked rule does. The
  // list's label says how they match, so their icons don't repeat it to screen readers.
  const renderTargets = (
    targets: readonly TargetPreview[],
    targetPattern: string,
    match: MatchKind,
    testSubj?: string
  ) =>
    targets.map(({ name, overriddenBy }) => (
      <EuiFlexGroup
        key={name}
        gutterSize="s"
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
        data-test-subj={testSubj}
      >
        <EuiFlexItem grow={false}>
          {renderName(
            <TargetName name={name} pattern={targetPattern} supersededBy={overriddenBy} />,
            match,
            false,
            overriddenBy !== undefined
          )}
        </EuiFlexItem>
        {overriddenBy && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <SupersedingRule rule={overriddenBy} />
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ));

  const renderMatching = () => {
    if (!type || !pattern) {
      return renderEmpty(
        i18n.translate('xpack.boost.patternMatches.enterPattern', {
          defaultMessage: 'Enter an index pattern to see matches',
        })
      );
    }
    // The tab counts the matches, and each row's icon shows how it matches, so the lists only name
    // that for screen readers.
    if (hasExactMatches) {
      return renderList(
        i18n.translate('xpack.boost.patternMatches.exactMatchesLabel', {
          defaultMessage: 'Exact matches',
        }),
        renderTargets(exactMatches, pattern, 'exact')
      );
    }
    if (partialMatches.length > 0) {
      // Subdued, since the rule doesn't apply to these yet.
      return renderList(
        i18n.translate('xpack.boost.patternMatches.partialMatchesLabel', {
          defaultMessage: 'Partial matches',
        }),
        renderTargets(partialMatches, partialPattern, 'partial', 'boostRulePartialMatch'),
        true
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
          names.map((name) => {
            const isHighlighted = highlightedNames.has(name);
            return (
              <div key={name} data-test-subj="boostRuleAvailableTarget">
                {renderName(
                  <TargetName name={name} pattern={isHighlighted ? highlightPattern : undefined} />,
                  isHighlighted ? matchKind : undefined,
                  // Matches are mixed with everything else here, so their icons say which they are.
                  true
                )}
              </div>
            );
          })
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
      {/* A margin rather than padding, so the tabs' border stops at the panel's padding. */}
      <EuiTabs size="s" css={{ margin: `${euiTheme.size.s} ${euiTheme.size.base} 0` }}>
        {TABS.map((id) => (
          <EuiTab
            key={id}
            id={getTabId(id)}
            aria-controls={panelId}
            isSelected={selectedTab === id}
            disabled={!type}
            onClick={() => setTab(id)}
            // Counted once a profile sets what's listed; exact matches count in the success color.
            append={
              type && (
                <EuiNotificationBadge
                  color={id === 'matching' && hasExactMatches ? 'success' : 'subdued'}
                  data-test-subj={id === 'all' ? 'boostRuleAllCount' : 'boostRuleMatchingCount'}
                >
                  {counts[id]}
                </EuiNotificationBadge>
              )
            }
            data-test-subj={id === 'all' ? 'boostRuleAllTab' : 'boostRuleMatchingTab'}
          >
            {TAB_LABELS[id][targetType]}
          </EuiTab>
        ))}
      </EuiTabs>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={getTabId(selectedTab)}
        css={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minBlockSize: 0,
          // With the 8px inside the list, the content sits 16px below the tabs and 16px from the
          // panel's other edges.
          padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
        }}
      >
        {selectedTab === 'matching' ? renderMatching() : renderAll()}
      </div>
    </EuiPanel>
  );
};
