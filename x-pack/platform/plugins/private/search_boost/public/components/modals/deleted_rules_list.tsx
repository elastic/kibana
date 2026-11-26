/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiText,
  euiOutline,
  useEuiOverflowScroll,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { BoostProfileType, DeletedRule } from '../../../common/types';
import { AffectedTable } from './affected_table';
import { FALLBACK_COLUMNS } from './fallback_columns';
import {
  DELETED_RULES_LIST_LABEL,
  formatTargetCount,
  getDeletedRuleTableLabel,
} from '../../translations';

interface DeletedRulesListProps {
  type: BoostProfileType;
  rules: readonly DeletedRule[];
}

const nameStyles = css`
  min-inline-size: 0;
  overflow-wrap: anywhere;
`;

// The media query EUI checks before animating the accordion.
const canAnimate = () =>
  window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches ?? false;

const withoutName = (names: ReadonlySet<string>, name: string): ReadonlySet<string> => {
  if (!names.has(name)) {
    return names;
  }
  const next = new Set(names);
  next.delete(name);
  return next;
};

// Well past EUI's accordion animation, for a collapse that's cancelled or skipped.
const CLOSING_FALLBACK_MS = 1000;

/** Rules whose accordion is still animating closed, so their tables stay mounted until it ends. */
const useClosingRuleNames = () => {
  const [closingRuleNames, setClosingRuleNames] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const currentTimers = timers.current;
    return () => currentTimers.forEach(clearTimeout);
  }, []);

  const finishClosing = useCallback((name: string) => {
    clearTimeout(timers.current.get(name));
    timers.current.delete(name);
    setClosingRuleNames((names) => withoutName(names, name));
  }, []);

  const startClosing = useCallback(
    (name: string) => {
      if (!canAnimate()) {
        return;
      }
      setClosingRuleNames((names) => new Set(names).add(name));
      clearTimeout(timers.current.get(name));
      timers.current.set(
        name,
        setTimeout(() => finishClosing(name), CLOSING_FALLBACK_MS)
      );
    },
    [finishClosing]
  );

  return { closingRuleNames, startClosing, finishClosing };
};

export const DeletedRulesList = ({ type, rules }: DeletedRulesListProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const scrollStyles = useEuiOverflowScroll('y');
  const accordionIdPrefix = useGeneratedHtmlId({ prefix: 'searchBoostDeletedRule' });
  const [openRuleName, setOpenRuleName] = useState<string>();
  const { closingRuleNames, startClosing, finishClosing } = useClosingRuleNames();

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.name.localeCompare(b.name)),
    [rules]
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      // The scrolling panel can't draw its own focus ring: the open rule's table would cover it.
      css={css`
        &:has(> [role='region']:focus-visible) {
          ${euiOutline(euiThemeContext, 'outset')}
        }
      `}
    >
      {/* The panel draws its border with a pseudo-element, so an inner panel scrolls instead. */}
      <EuiPanel
        color="transparent"
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        role="region"
        aria-label={DELETED_RULES_LIST_LABEL}
        tabIndex={0}
        css={css`
          ${scrollStyles}
          max-block-size: ${euiTheme.base * 18}px;
        `}
        data-test-subj="searchBoostDeletedRulesList"
      >
        {sortedRules.map(({ name, fallbacks }, index) => {
          const isOpen = openRuleName === name;
          return (
            <Fragment key={name}>
              {index > 0 && <EuiHorizontalRule margin="none" />}
              {fallbacks.length > 0 ? (
                <EuiAccordion
                  id={`${accordionIdPrefix}-${index}`}
                  forceState={isOpen ? 'open' : 'closed'}
                  onToggle={(isNowOpen) => {
                    if (openRuleName !== undefined) {
                      startClosing(openRuleName);
                    }
                    setOpenRuleName(isNowOpen ? name : undefined);
                  }}
                  onTransitionEnd={({ propertyName }) => {
                    if (propertyName === 'height') {
                      finishClosing(name);
                    }
                  }}
                  arrowDisplay="none"
                  buttonContent={
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem css={nameStyles}>
                        <EuiText size="s">{name}</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false} css={{ display: 'block' }}>
                        <EuiBadge color="hollow">
                          {formatTargetCount(type, fallbacks.length)}
                        </EuiBadge>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          type={isOpen ? 'chevronSingleUp' : 'chevronSingleDown'}
                          aria-hidden={true}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                  buttonContentClassName="eui-fullWidth"
                  buttonProps={{ paddingSize: 's' }}
                  paddingSize="s"
                  css={css`
                    padding-inline: ${euiTheme.size.s};
                  `}
                  data-test-subj="searchBoostDeletedRule"
                >
                  {(isOpen || closingRuleNames.has(name)) && (
                    <AffectedTable
                      aria-label={getDeletedRuleTableLabel(type, name)}
                      type={type}
                      targets={fallbacks}
                      columns={FALLBACK_COLUMNS}
                      isNested
                      data-test-subj="searchBoostDeletedRuleTable"
                    />
                  )}
                </EuiAccordion>
              ) : (
                // Lines up with the names of the rules that open.
                <EuiText
                  size="s"
                  css={[
                    nameStyles,
                    css`
                      padding: ${euiTheme.size.s} ${euiTheme.size.base};
                      line-height: ${euiTheme.size.l};
                    `,
                  ]}
                  data-test-subj="searchBoostDeletedRule"
                >
                  {name}
                </EuiText>
              )}
            </Fragment>
          );
        })}
      </EuiPanel>
    </EuiPanel>
  );
};
