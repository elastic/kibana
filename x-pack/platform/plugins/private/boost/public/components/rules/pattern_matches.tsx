/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { EuiIcon, EuiPanel, EuiSelectable, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostDataSource, BoostProfileType } from '../../../common/types';
import { formatHiddenTargets } from '../hidden_data';
import { SupersedingRule, TargetName, getSupersedingDescription } from './target_name';
import { TARGET_LIST_HEADER_HEIGHT, TargetListHeader } from './target_list_header';

/** A data source a rule's name or pattern matches. */
export interface TargetPreview {
  name: string;
  /** The name or pattern that matches it, whose spelled-out parts are highlighted. */
  pattern: string;
  /** A higher-ranked rule that still applies to this target, if any. */
  overriddenBy?: string;
  isHidden?: boolean;
}

/**
 * What partially matches a pattern until it matches something: whatever contains it, so a
 * remembered part of a name finds it.
 */
export const getPartialPattern = (pattern: string) => `*${pattern}*`;

// Labels each list for screen readers; the header says how many it shows.
const ALL_LABELS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.patternMatches.allIndicesLabel', {
    defaultMessage: 'All indices',
  }),
  data_streams: i18n.translate('xpack.boost.patternMatches.allDataStreamsLabel', {
    defaultMessage: 'All data streams',
  }),
};

// Heads the list until something is typed, when it starts counting matches.
const UNFILTERED_TITLES: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.patternMatches.unfilteredIndicesTitle', {
    defaultMessage: 'Enter a pattern or select an index',
  }),
  data_streams: i18n.translate('xpack.boost.patternMatches.unfilteredDataStreamsTitle', {
    defaultMessage: 'Enter a pattern or select a data stream',
  }),
};

// Why the list's switches are off, when they are.
const UNFILTERED_REASON = i18n.translate('xpack.boost.patternMatches.unfilteredReason', {
  defaultMessage: "The list isn't filtered until you enter a pattern or name.",
});

const NO_HIDDEN_REASONS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.patternMatches.noHiddenIndicesReason', {
    defaultMessage: 'There are no hidden indices.',
  }),
  data_streams: i18n.translate('xpack.boost.patternMatches.noHiddenDataStreamsReason', {
    defaultMessage: 'There are no hidden data streams.',
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

type MatchKind = 'exact' | 'partial';

// Each row shows whether the pattern matches it exactly or partly.
const MATCH_ICONS: Readonly<Record<MatchKind, { iconType: string; label: string }>> = {
  exact: {
    iconType: 'check',
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
  /** Whether the icon is disabled, like the name of a match that a higher-ranked rule keeps. */
  isDisabled?: boolean;
  /** Whether screen readers hear what the icon means, which a list's label may already say. */
  isLabeled: boolean;
}

/** An exact or partial match's icon, or a blank space as wide, so names line up. */
const MatchIcon = ({ match, isDisabled = false, isLabeled }: MatchIconProps) => {
  const { euiTheme } = useEuiTheme();
  if (!match) {
    return <EuiIcon type="empty" size="m" aria-hidden={true} />;
  }
  const { iconType, label } = MATCH_ICONS[match];
  // An exact match takes the primary color with its name, like a selected option, and a partial
  // match the color of its name.
  const color = isDisabled
    ? euiTheme.colors.textDisabled
    : match === 'exact'
    ? euiTheme.colors.textPrimary
    : euiTheme.colors.textParagraph;
  return isLabeled ? (
    <EuiIcon type={iconType} color={color} size="m" title={label} />
  ) : (
    <EuiIcon type={iconType} color={color} size="m" aria-hidden={true} />
  );
};

// Each row is as tall as EUI's selectable options, which the lists are.
const ROW_HEIGHT = 32;

/** Passed to each option's renderer through EUI's `data`, which keeps it out of the page's HTML. */
interface TargetOptionData {
  /** The name or pattern that matches it, whose spelled-out parts are highlighted. */
  pattern?: string;
  match?: MatchKind;
  /** A higher-ranked rule that keeps it. */
  overriddenBy?: string;
  isHidden?: boolean;
}

interface TargetRow extends TargetOptionData {
  name: string;
}

interface PatternMatchesProps {
  /** The rule's profile type, which sets what it can target. */
  type: BoostProfileType;
  /** What's typed in the rule's field, until which there's nothing to match. */
  pattern: string;
  /** What the name or pattern matches. */
  exactMatches: readonly TargetPreview[];
  /** What contains it, until it matches something. */
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
  /** Uses a listed name as the rule's target. */
  onSelectName: (name: string) => void;
  /**
   * For each data source, a higher-ranked rule that would keep it if the rule named it, which the
   * list of every data source notes for those the rule doesn't match yet.
   */
  outrankedIfChosen?: ReadonlyMap<string, string>;
}

const formatMatchCount = (match: MatchKind, count: number): string =>
  match === 'exact'
    ? i18n.translate('xpack.boost.patternMatches.exactMatchCount', {
        defaultMessage: '{count, plural, one {# exact match} other {# exact matches}}',
        values: { count },
      })
    : i18n.translate('xpack.boost.patternMatches.partialMatchCount', {
        defaultMessage: '{count, plural, one {# partial match} other {# partial matches}}',
        values: { count },
      });

/**
 * Every data source a rule could target, which the rule's name or pattern filters as it's typed to
 * what it matches, or partly matches until it matches something. A switch keeps the rest listed
 * alongside the matches. Choosing a name makes it the rule's target. Hidden data sources are left
 * out until another switch shows them, with a note of how many, so the list adds up to its count.
 */
export const PatternMatches = ({
  type,
  pattern,
  exactMatches,
  partialMatches,
  dataSources,
  hasHidden,
  includesHidden,
  onIncludesHiddenChange,
  maxHeight,
  onSelectName,
  outrankedIfChosen,
}: PatternMatchesProps) => {
  const { euiTheme } = useEuiTheme();
  // Whether the names the pattern doesn't match stay listed, marked apart from the matches.
  const [showsUnmatched, setShowsUnmatched] = useState(false);
  // Every data source is listed until something is typed.
  const isFiltered = Boolean(pattern) && !showsUnmatched;

  // The full list marks the same names as the filtered one.
  const hasExactMatches = exactMatches.length > 0;
  const matchesByName = new Map(
    (hasExactMatches ? exactMatches : partialMatches).map((target) => [target.name, target])
  );
  const matchKind: MatchKind = hasExactMatches ? 'exact' : 'partial';

  // How many the pattern matches, which only counts exact matches, hidden ones included, as the
  // rule applies to them all the same, shown or not, or how many it partly matches until then.
  // Until something is typed, a title says what the list is for instead: it only ever counts
  // matches, rather than a list whose length depends on whether hidden data sources are shown.
  const getTitle = (): string => {
    if (!pattern) {
      return UNFILTERED_TITLES[type];
    }
    if (hasExactMatches) {
      return formatMatchCount('exact', exactMatches.length);
    }
    if (partialMatches.length > 0) {
      return formatMatchCount('partial', partialMatches.length);
    }
    return i18n.translate('xpack.boost.patternMatches.matchCount', {
      defaultMessage: '{count, plural, one {# match} other {# matches}}',
      values: { count: 0 },
    });
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

  // How many hidden data sources a list leaves out, in a row after any others, as tall as them and
  // after the icon of how they match, if they do. As in the "Applies to" lists, it's in italics,
  // setting the count apart from the names. It takes the color of the names it stands for: the
  // primary color for exact matches, unless higher-ranked rules keep every one of them.
  const renderHiddenNote = (
    count: number,
    isAfterOthers: boolean,
    match?: MatchKind,
    isOutranked = false
  ) =>
    count > 0 && (
      <EuiText
        size="s"
        color={
          match !== 'exact'
            ? undefined
            : isOutranked
            ? euiTheme.colors.textDisabled
            : euiTheme.colors.textPrimary
        }
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: euiTheme.size.s,
          blockSize: ROW_HEIGHT,
          paddingInline: euiTheme.size.s,
          fontStyle: 'italic',
        }}
        data-test-subj="boostRuleHiddenNotShown"
      >
        <MatchIcon match={match} isDisabled={isOutranked} isLabeled={false} />
        {formatHiddenTargets(type, count, isAfterOthers)}
      </EuiText>
    );

  const isEveryOutranked = (targets: ReadonlyArray<Pick<TargetPreview, 'overriddenBy'>>) =>
    targets.every(({ overriddenBy }) => overriddenBy !== undefined);

  // A list of targets, each after its match icon, struck through with the rule that keeps it when a
  // higher-ranked rule does. Each is an option that makes it the rule's target, with the hover of
  // EUI's selectable options. They're never marked as selected, since what's typed decides that: an
  // exact match takes the primary color instead. A note of hidden ones that are left out follows.
  const renderList = (
    label: string,
    rows: readonly TargetRow[],
    note: ReactNode,
    /** Whether the icons tell screen readers how each target matches. */
    isLabeled: boolean,
    testSubj?: string
  ) => {
    // As tall as its options, up to what the panel leaves under its header and around the note.
    const height = Math.min(
      rows.length * ROW_HEIGHT,
      maxHeight - TARGET_LIST_HEADER_HEIGHT - 2 * euiTheme.base * 0.5 - (note ? ROW_HEIGHT : 0)
    );
    return (
      <>
        {rows.length > 0 && (
          <EuiSelectable<TargetOptionData>
            // EUI labels the list once, so a list of other matches is a new one.
            key={label}
            aria-label={label}
            singleSelection
            options={rows.map(({ name, ...data }) => ({
              label: name,
              data,
              prepend: (
                <MatchIcon
                  match={data.match}
                  isDisabled={data.overriddenBy !== undefined}
                  isLabeled={isLabeled}
                />
              ),
              // An option can't hold a focusable tooltip, so the option shows the explanation in its
              // own, on hover and when it's reached with the keyboard.
              append: data.overriddenBy && (
                <EuiText size="xs" color="subdued">
                  <SupersedingRule rule={data.overriddenBy} hasTooltip={false} />
                </EuiText>
              ),
              toolTipContent: data.overriddenBy && getSupersedingDescription(data.overriddenBy),
              'data-test-subj': testSubj,
            }))}
            onChange={(_options, _event, { label: name }) => onSelectName(name)}
            renderOption={({ label: name, pattern: rowPattern, match, overriddenBy, isHidden }) => {
              const isPrimary = match === 'exact' && overriddenBy === undefined;
              const targetName = (
                <TargetName
                  name={name}
                  pattern={rowPattern}
                  supersededBy={overriddenBy}
                  isHidden={isHidden}
                  inheritsColor={isPrimary}
                />
              );
              return isPrimary ? (
                <span css={{ color: euiTheme.colors.textPrimary }}>{targetName}</span>
              ) : (
                targetName
              );
            }}
            listProps={{ rowHeight: ROW_HEIGHT, showIcons: false }}
            height={height}
          >
            {(list) => list}
          </EuiSelectable>
        )}
        {note}
      </>
    );
  };

  // The list's label says how these match, so their icons don't repeat it to screen readers.
  // Hidden ones are counted after the rest until they're shown.
  const renderTargets = (
    label: string,
    targets: readonly TargetPreview[],
    match: MatchKind,
    testSubj?: string
  ) => {
    const shown = includesHidden ? targets : targets.filter(({ isHidden }) => !isHidden);
    const left = targets.filter((target) => !shown.includes(target));
    return renderList(
      label,
      shown.map(({ name, pattern: targetPattern, overriddenBy, isHidden }) => ({
        name,
        pattern: targetPattern,
        match,
        overriddenBy,
        isHidden,
      })),
      renderHiddenNote(left.length, shown.length > 0, match, isEveryOutranked(left)),
      false,
      testSubj
    );
  };

  const renderMatching = () => {
    // The count above the list and each row's icon show how they match, so the lists only name that
    // for screen readers.
    if (hasExactMatches) {
      return renderTargets(
        i18n.translate('xpack.boost.patternMatches.exactMatchesLabel', {
          defaultMessage: 'Exact matches',
        }),
        exactMatches,
        'exact'
      );
    }
    if (partialMatches.length > 0) {
      return renderTargets(
        i18n.translate('xpack.boost.patternMatches.partialMatchesLabel', {
          defaultMessage: 'Partial matches',
        }),
        partialMatches,
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
      return renderEmpty(NO_DATA_SOURCES[type]);
    }
    const shown = includesHidden ? dataSources : dataSources.filter(({ hidden }) => !hidden);
    // As in the matching list, only hidden matches are counted, so the note doesn't count others as
    // matches. With nothing else to list, every hidden data source is counted, without an icon.
    const hiddenMatches = includesHidden
      ? []
      : dataSources.flatMap(({ name, hidden }) => {
          const target = hidden ? matchesByName.get(name) : undefined;
          return target ? [target] : [];
        });
    const hiddenNote =
      shown.length === 0 && hiddenMatches.length === 0
        ? renderHiddenNote(dataSources.length, false)
        : renderHiddenNote(
            hiddenMatches.length,
            shown.length > 0,
            matchKind,
            isEveryOutranked(hiddenMatches)
          );
    // Matches are mixed with everything else here, so their icons say which they are, and each
    // notes a higher-ranked rule that keeps it, as in the filtered list. The rest note one that
    // would keep them if the rule named them, since choosing one does.
    return renderList(
      ALL_LABELS[type],
      shown.map(({ name, hidden }) => {
        const target = matchesByName.get(name);
        return {
          name,
          pattern: target?.pattern,
          match: target && matchKind,
          overriddenBy: target ? target.overriddenBy : outrankedIfChosen?.get(name),
          isHidden: hidden,
        };
      }),
      hiddenNote,
      true,
      'boostRuleAvailableTarget'
    );
  };

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={{ display: 'flex', flexDirection: 'column' }}
      data-test-subj="boostRulePatternMatches"
    >
      {/* Showing unmatched names is off until something is typed, since everything is listed until
          then, and showing hidden ones while there's nothing hidden to show, unless either is on
          already. */}
      <TargetListHeader
        unmatched={{
          checked: showsUnmatched,
          onChange: setShowsUnmatched,
          disabledReason: !pattern && !showsUnmatched ? UNFILTERED_REASON : undefined,
        }}
        hidden={{
          checked: includesHidden,
          onChange: onIncludesHiddenChange,
          disabledReason: !hasHidden && !includesHidden ? NO_HIDDEN_REASONS[type] : undefined,
        }}
      >
        {/* Announced as it changes, since it follows what's typed in another field. */}
        <EuiText
          size="xs"
          color="subdued"
          aria-live="polite"
          data-test-subj="boostRulePatternMatchCount"
        >
          {getTitle()}
        </EuiText>
      </TargetListHeader>
      {/* The options' hover fills the panel, less 8px around them. */}
      <div css={{ padding: euiTheme.size.s }}>{isFiltered ? renderMatching() : renderAll()}</div>
    </EuiPanel>
  );
};
