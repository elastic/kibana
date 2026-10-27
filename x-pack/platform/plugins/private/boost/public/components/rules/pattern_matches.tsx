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
  useEuiOverflowScroll,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostDataSource, BoostProfileType } from '../../../common/types';
import { ShowHiddenSwitch, formatHiddenNotShown } from '../hidden_data';
import { SupersedingRule, TargetName } from './target_name';
import { TargetStatus } from './target_status';

/** A data source an index pattern matches. */
export interface TargetPreview {
  name: string;
  /** A higher-ranked rule that still applies to this target, if any. */
  overriddenBy?: string;
  isHidden?: boolean;
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

const HIDDEN_NOTE_TEST_SUBJ = 'boostRuleHiddenNotShown';

// Each row shows whether the pattern matches it exactly or partly.
const MATCH_ICONS: Readonly<Record<MatchKind, { iconType: string; label: string }>> = {
  exact: {
    iconType: 'checkCircle',
    label: i18n.translate('xpack.boost.patternMatches.exactMatchIcon', {
      defaultMessage: 'Exact match',
    }),
  },
  partial: {
    iconType: 'partial',
    label: i18n.translate('xpack.boost.patternMatches.partialMatchIcon', {
      defaultMessage: 'Partial match',
    }),
  },
};

interface MatchIconProps {
  /** How the name matches the pattern, or nothing when it doesn't. */
  match?: MatchKind;
  /** Whether a higher-ranked rule keeps the match, so its icon is disabled like its name. */
  isSuperseded?: boolean;
  /** Whether screen readers hear what the icon means, which a list's label may already say. */
  isLabeled: boolean;
}

/** An exact or partial match's icon, or a blank space as wide, so names line up. */
const MatchIcon = ({ match, isSuperseded = false, isLabeled }: MatchIconProps) => {
  const { euiTheme } = useEuiTheme();
  if (!match) {
    return <EuiIcon type="empty" size="m" aria-hidden={true} />;
  }
  const { iconType, label } = MATCH_ICONS[match];
  // Green for an exact match, and a partial match in the same color as its name.
  const color = isSuperseded
    ? euiTheme.colors.textDisabled
    : match === 'exact'
    ? 'success'
    : euiTheme.colors.textParagraph;
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
  dataSources: ReadonlyArray<Pick<BoostDataSource, 'name' | 'hidden'>>;
  /** Whether any data source of the rule's type is hidden, so there's anything to show. */
  hasHidden: boolean;
  /** Whether the lists show hidden data sources, which they otherwise count but leave out. */
  includesHidden: boolean;
  onIncludesHiddenChange: (includesHidden: boolean) => void;
  /** The panel's tallest height, past which its list scrolls. */
  maxHeight: number;
}

interface PatternMatchStatusProps {
  exactCount: number;
  partialCount: number;
}

/** How well a pattern matches, for beside its label: exactly, partly, or not at all. */
export const PatternMatchStatus = ({ exactCount, partialCount }: PatternMatchStatusProps) => (
  <TargetStatus
    label={
      exactCount > 0
        ? i18n.translate('xpack.boost.patternMatches.exactCount', {
            defaultMessage: '{count, plural, one {# exact match} other {# exact matches}}',
            values: { count: exactCount },
          })
        : partialCount > 0
        ? i18n.translate('xpack.boost.patternMatches.partialCount', {
            defaultMessage: '{count, plural, one {# partial match} other {# partial matches}}',
            values: { count: partialCount },
          })
        : i18n.translate('xpack.boost.patternMatches.noMatchesCount', {
            defaultMessage: '0 matches',
          })
    }
    data-test-subj="boostRulePatternMatchCount"
  />
);

/**
 * What an index pattern matches, or partly matches until it matches something, beside every data
 * source it could target, like the data view editor's preview. Hidden data sources are left out
 * until a switch beside the tabs shows them, with a note of how many, so the lists add up to the
 * pattern's match count.
 */
export const PatternMatches = ({
  type,
  targetType,
  pattern,
  exactMatches,
  partialMatches,
  dataSources,
  hasHidden,
  includesHidden,
  onIncludesHiddenChange,
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
  const matchesByName = new Map(
    (hasExactMatches ? exactMatches : partialMatches).map((target) => [target.name, target])
  );
  const matchKind: MatchKind = hasExactMatches ? 'exact' : 'partial';

  const renderEmpty = (message: string, testSubj = 'boostRulePatternMatchesEmpty') => (
    <EuiText
      size="s"
      color={euiTheme.colors.textDisabled}
      textAlign="center"
      // 24px from the tabs and the panel's bottom edge, after the space around the tab's content.
      css={{ paddingBlock: euiTheme.size.base }}
      data-test-subj={testSubj}
    >
      <p>{message}</p>
    </EuiText>
  );

  // Hidden data sources that a list leaves out, said as the empty messages are.
  const getHiddenNote = (count: number) => formatHiddenNotShown(targetType, count);
  const renderHiddenNote = (count: number) =>
    count > 0 && (
      <EuiText
        key="hiddenNote"
        size="s"
        color={euiTheme.colors.textDisabled}
        textAlign="center"
        data-test-subj={HIDDEN_NOTE_TEST_SUBJ}
      >
        <p>{getHiddenNote(count)}</p>
      </EuiText>
    );

  // The scrolling area keeps 8px of padding, which its scroll mask fades.
  const renderList = (label: string, rows: ReactNode) => (
    <EuiText
      size="s"
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

  // A target after its match icon, struck through with the rule that keeps it when a higher-ranked
  // rule does.
  const renderRow = ({
    name,
    pattern: rowPattern,
    match,
    overriddenBy,
    isHidden,
    isLabeled,
    testSubj,
  }: {
    name: string;
    pattern?: string;
    match?: MatchKind;
    overriddenBy?: string;
    isHidden?: boolean;
    /** Whether the icon tells screen readers how the target matches. */
    isLabeled: boolean;
    testSubj?: string;
  }) => (
    <EuiFlexGroup
      key={name}
      gutterSize="s"
      justifyContent="spaceBetween"
      alignItems="center"
      responsive={false}
      data-test-subj={testSubj}
    >
      <EuiFlexItem grow={false}>
        <span css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.s }}>
          <MatchIcon
            match={match}
            isSuperseded={overriddenBy !== undefined}
            isLabeled={isLabeled}
          />
          <TargetName
            name={name}
            pattern={rowPattern}
            supersededBy={overriddenBy}
            isHidden={isHidden}
          />
        </span>
      </EuiFlexItem>
      {overriddenBy && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <SupersedingRule rule={overriddenBy} />
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  // The list's label says how these match, so their icons don't repeat it to screen readers.
  // Hidden ones are counted after the rest until they're shown, or instead of them if they're all
  // hidden.
  const renderTargets = (
    label: string,
    targets: readonly TargetPreview[],
    targetPattern: string,
    match: MatchKind,
    testSubj?: string
  ) => {
    const shown = includesHidden ? targets : targets.filter(({ isHidden }) => !isHidden);
    const hiddenCount = targets.length - shown.length;
    if (shown.length === 0) {
      return renderEmpty(getHiddenNote(hiddenCount), HIDDEN_NOTE_TEST_SUBJ);
    }
    return renderList(label, [
      ...shown.map(({ name, overriddenBy, isHidden }) =>
        renderRow({
          name,
          pattern: targetPattern,
          match,
          overriddenBy,
          isHidden,
          isLabeled: false,
          testSubj,
        })
      ),
      renderHiddenNote(hiddenCount),
    ]);
  };

  const renderMatching = () => {
    if (!type || !pattern) {
      return renderEmpty(
        i18n.translate('xpack.boost.patternMatches.enterPattern', {
          defaultMessage: 'Enter an index pattern to see matches',
        })
      );
    }
    // The count beside the pattern's label and each row's icon show how they match, so the lists
    // only name that for screen readers.
    if (hasExactMatches) {
      return renderTargets(
        i18n.translate('xpack.boost.patternMatches.exactMatchesLabel', {
          defaultMessage: 'Exact matches',
        }),
        exactMatches,
        pattern,
        'exact'
      );
    }
    if (partialMatches.length > 0) {
      return renderTargets(
        i18n.translate('xpack.boost.patternMatches.partialMatchesLabel', {
          defaultMessage: 'Partial matches',
        }),
        partialMatches,
        partialPattern,
        'partial',
        'boostRulePartialMatch'
      );
    }
    return renderEmpty(
      i18n.translate('xpack.boost.patternMatches.noMatches', {
        defaultMessage: 'No matches detected',
      })
    );
  };

  const renderAll = () => {
    if (dataSources.length === 0) {
      return renderEmpty(NO_DATA_SOURCES[targetType]);
    }
    const shown = includesHidden ? dataSources : dataSources.filter(({ hidden }) => !hidden);
    const hiddenCount = dataSources.length - shown.length;
    if (shown.length === 0) {
      return renderEmpty(getHiddenNote(hiddenCount), HIDDEN_NOTE_TEST_SUBJ);
    }
    return renderList(
      TAB_LABELS.all[targetType],
      // Matches are mixed with everything else here, so their icons say which they are, and each
      // notes a higher-ranked rule that keeps it, as in the matching list.
      [
        ...shown.map(({ name, hidden }) => {
          const target = matchesByName.get(name);
          return renderRow({
            name,
            pattern: target && highlightPattern,
            match: target && matchKind,
            overriddenBy: target?.overriddenBy,
            isHidden: hidden,
            isLabeled: true,
            testSubj: 'boostRuleAvailableTarget',
          });
        }),
        renderHiddenNote(hiddenCount),
      ]
    );
  };

  return (
    <EuiPanel
      color="subdued"
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={{ display: 'flex', flexDirection: 'column', maxBlockSize: maxHeight }}
      data-test-subj="boostRulePatternMatches"
    >
      {/* The tabs, and the switch that shows hidden data sources at their end. The row draws the
        tabs' border, as the tabs do, so it runs under the switch too. A margin rather than padding,
        so the border stops at the panel's padding. */}
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: euiTheme.size.m,
          margin: `${euiTheme.size.s} ${euiTheme.size.base} 0`,
          boxShadow: `inset 0 -${euiTheme.border.width.thin} 0 ${euiTheme.border.color}`,
        }}
      >
        <EuiTabs size="s" bottomBorder={false}>
          {TABS.map((id) => (
            <EuiTab
              key={id}
              id={getTabId(id)}
              aria-controls={panelId}
              isSelected={selectedTab === id}
              disabled={!type}
              onClick={() => setTab(id)}
              data-test-subj={id === 'all' ? 'boostRuleAllTab' : 'boostRuleMatchingTab'}
            >
              {TAB_LABELS[id][targetType]}
            </EuiTab>
          ))}
        </EuiTabs>
        {/* Off until a profile is selected, like the tabs, and while there's nothing hidden to show,
          unless it's on already. */}
        <ShowHiddenSwitch
          checked={includesHidden}
          onChange={onIncludesHiddenChange}
          disabled={!type || (!hasHidden && !includesHidden)}
          data-test-subj="boostRuleShowHidden"
        />
      </div>
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
