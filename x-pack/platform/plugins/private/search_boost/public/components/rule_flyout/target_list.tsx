/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { BoostProfileType } from '../../../common/types';
import { getOutrankedTooltip } from '../../translations';
import type { MatchedTarget } from './target_matches';
import {
  LIST_OPTIONS_LABEL,
  MATCH_LABELS,
  NO_MATCHES_COUNT,
  NO_MATCHES_DETECTED,
  NO_TARGETS_DETECTED,
  SHOW_UNMATCHED_LABEL,
  TARGET_LIST_PROMPTS,
  UNFILTERED_LIST_REASON,
  getExactMatchesCount,
  getOutrankedByLabel,
  getPartialMatchesCount,
} from './translations';

export interface TargetListProps {
  type: BoostProfileType;
  pattern: string;
  targets: readonly MatchedTarget[];
  isDisabled?: boolean;
  onSelect: (name: string) => void;
}

const MATCH_ICONS = { exact: 'check', partial: 'partial' } as const;

const getListStyles = ({ base }: EuiThemeComputed) => css`
  max-height: ${base * 20}px;
  overflow-y: auto;
`;

const outrankedNameStyles = css`
  text-decoration: line-through;
`;

const getTitle = (type: BoostProfileType, pattern: string, targets: readonly MatchedTarget[]) => {
  if (pattern.length === 0) {
    return TARGET_LIST_PROMPTS[type];
  }
  const exactCount = targets.filter(({ matchType }) => matchType === 'exact').length;
  if (exactCount > 0) {
    return getExactMatchesCount(exactCount);
  }
  const partialCount = targets.filter(({ matchType }) => matchType === 'partial').length;
  return partialCount > 0 ? getPartialMatchesCount(partialCount) : NO_MATCHES_COUNT;
};

const getEmptyMessage = (
  type: BoostProfileType,
  pattern: string,
  targets: readonly MatchedTarget[]
) => {
  if (targets.length === 0) {
    return NO_TARGETS_DETECTED[type];
  }
  return pattern.length > 0 ? NO_MATCHES_DETECTED : TARGET_LIST_PROMPTS[type];
};

interface ListOptionSwitchProps {
  label: string;
  checked: boolean;
  /** Why the switch can't be turned on, if it can't. */
  disabledReason?: string;
  onChange: (checked: boolean) => void;
  'data-test-subj': string;
}

const ListOptionSwitch = ({
  label,
  checked,
  disabledReason,
  onChange,
  'data-test-subj': dataTestSubj,
}: ListOptionSwitchProps) => {
  const reasonId = useGeneratedHtmlId({ prefix: 'searchBoostListOptionReason' });
  const isDisabled = Boolean(disabledReason);
  const toggle = (
    <EuiSwitch
      compressed
      label={label}
      checked={checked}
      disabled={isDisabled}
      aria-hidden={isDisabled || undefined}
      onChange={(event) => onChange(event.target.checked)}
      data-test-subj={dataTestSubj}
    />
  );
  return disabledReason ? (
    <EuiToolTip
      content={disabledReason}
      // The tooltip only links its text while it's shown, which is too late for screen readers
      // announcing the focused wrapper, so the wrapper links the hidden copy below instead.
      disableScreenReaderOutput
      anchorProps={{ 'data-test-subj': `${dataTestSubj}Tip` }}
    >
      {/* A disabled switch can't take focus, so this wrapper stands in for it, for keyboard and
       screen reader users, while the switch inside only shows its disabled look. */}
      <div
        tabIndex={0}
        role="switch"
        aria-checked={checked}
        aria-disabled={true}
        aria-label={label}
        aria-describedby={reasonId}
        data-test-subj={`${dataTestSubj}Trigger`}
      >
        {toggle}
        <span id={reasonId} hidden>
          {disabledReason}
        </span>
      </div>
    </EuiToolTip>
  ) : (
    toggle
  );
};

const TargetName = ({ target }: { target: MatchedTarget }) => {
  const { euiTheme } = useEuiTheme();
  const { nameParts, matchType, outrankedByRuleName } = target;

  const getColor = () => {
    if (outrankedByRuleName) {
      return euiTheme.colors.textDisabled;
    }
    return matchType === 'exact' ? euiTheme.colors.textPrimary : undefined;
  };

  return (
    <EuiText
      size="s"
      color={getColor()}
      css={outrankedByRuleName ? outrankedNameStyles : undefined}
      data-test-subj="searchBoostRuleTargetName"
    >
      {nameParts.map(({ text, isTyped }, index) =>
        isTyped ? <strong key={index}>{text}</strong> : <span key={index}>{text}</span>
      )}
    </EuiText>
  );
};

const TargetLabel = ({ target }: { target: MatchedTarget }) => {
  const { euiTheme } = useEuiTheme();
  const { outrankedByRuleName } = target;

  return (
    <EuiFlexGroup
      component="span"
      gutterSize="s"
      alignItems="center"
      justifyContent="spaceBetween"
      responsive={false}
    >
      <EuiFlexItem component="span" grow={false}>
        <TargetName target={target} />
      </EuiFlexItem>
      {outrankedByRuleName ? (
        <EuiFlexItem component="span" grow={false}>
          <EuiText size="xs" color="subdued" data-test-subj="searchBoostRuleTargetOutrankedBy">
            <EuiIcon
              type="sortAscending"
              size="s"
              color={euiTheme.colors.textDisabled}
              aria-label={getOutrankedByLabel(outrankedByRuleName)}
            />{' '}
            <span aria-hidden={true}>{outrankedByRuleName}</span>
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

/** Lists the indices or data streams a rule can target, narrowing them down as a pattern is typed. */
export const TargetList = ({ type, pattern, targets, isDisabled, onSelect }: TargetListProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'searchBoostRuleTargetsTitle' });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showsUnmatched, setShowsUnmatched] = useState(false);

  const hasPattern = pattern.length > 0;
  const visibleTargets = targets
    .filter(({ matchType }) => !hasPattern || showsUnmatched || matchType)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s" data-test-subj="searchBoostRuleTargets">
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            id={titleId}
            aria-live="polite"
            data-test-subj="searchBoostRuleTargetsTitle"
          >
            {getTitle(type, pattern, targets)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isMenuOpen}
            closePopover={() => setIsMenuOpen(false)}
            anchorPosition="downRight"
            panelPaddingSize="s"
            aria-label={LIST_OPTIONS_LABEL}
            button={
              <EuiToolTip content={LIST_OPTIONS_LABEL} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="ellipsis"
                  size="xs"
                  color="text"
                  aria-label={LIST_OPTIONS_LABEL}
                  onClick={() => setIsMenuOpen((open) => !open)}
                  data-test-subj="searchBoostRuleTargetsOptions"
                />
              </EuiToolTip>
            }
          >
            <ListOptionSwitch
              label={SHOW_UNMATCHED_LABEL}
              checked={showsUnmatched}
              disabledReason={hasPattern ? undefined : UNFILTERED_LIST_REASON}
              onChange={setShowsUnmatched}
              data-test-subj="searchBoostRuleTargetsShowUnmatched"
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {visibleTargets.length > 0 ? (
        <div css={getListStyles(euiTheme)}>
          <EuiListGroup maxWidth={false} ariaLabelledby={titleId}>
            {visibleTargets.map((target) => {
              const { name, matchType, outrankedByRuleName } = target;
              return (
                <EuiListGroupItem
                  key={name}
                  wrapText
                  label={<TargetLabel target={target} />}
                  icon={
                    matchType ? (
                      <EuiIcon
                        type={MATCH_ICONS[matchType]}
                        aria-label={MATCH_LABELS[matchType]}
                        color={outrankedByRuleName ? euiTheme.colors.textDisabled : undefined}
                      />
                    ) : (
                      <EuiIcon type="empty" aria-hidden={true} />
                    )
                  }
                  isDisabled={isDisabled || Boolean(outrankedByRuleName)}
                  hasAriaDisabled={!isDisabled && Boolean(outrankedByRuleName)}
                  showToolTip={Boolean(outrankedByRuleName)}
                  toolTipText={
                    outrankedByRuleName ? getOutrankedTooltip(outrankedByRuleName) : undefined
                  }
                  toolTipProps={
                    outrankedByRuleName
                      ? { anchorProps: { 'data-test-subj': `searchBoostRuleTargetTip-${name}` } }
                      : undefined
                  }
                  onClick={() => onSelect(name)}
                  data-test-subj={`searchBoostRuleTarget-${name}`}
                />
              );
            })}
          </EuiListGroup>
        </div>
      ) : (
        <EuiText
          size="s"
          color="subdued"
          textAlign="center"
          data-test-subj="searchBoostRuleTargetsEmpty"
        >
          <p>{getEmptyMessage(type, pattern, targets)}</p>
        </EuiText>
      )}
    </EuiPanel>
  );
};
