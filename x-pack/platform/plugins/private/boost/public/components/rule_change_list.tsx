/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { Fragment, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiNotificationBadge,
  EuiPanel,
  EuiText,
  useEuiOverflowScroll,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

export interface RuleChangeListItem {
  name: string;
  /** Shown after the name, such as a "Default" badge. */
  nameAppend?: ReactNode;
  /** How many indices or data streams change, shown in a badge beside the name. */
  count?: string;
  /** What changes, shown when the rule is opened. Without it, the rule doesn't open. */
  details?: ReactNode;
  'data-test-subj'?: string;
}

interface RuleChangeListProps {
  /** The id of the list's visible title. */
  titleId: string;
  items: readonly RuleChangeListItem[];
}

/** Rules that a change affects, each opening to show what changes for the data sources it covers. */
export const RuleChangeList = ({ titleId, items }: RuleChangeListProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const accordionIdPrefix = useGeneratedHtmlId({ prefix: 'ruleChange' });
  // Only one rule is open at a time, so the list stays short.
  const [openRuleName, setOpenRuleName] = useState<string>();

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      {/* Long lists scroll inside the panel, keeping the modal's buttons in view. The panel draws
          its border with a pseudo-element, so an inner element scrolls instead, or the border would
          scroll away with the content. */}
      <div
        role="region"
        aria-labelledby={titleId}
        tabIndex={0}
        css={css`
          ${scrollStyles}
          max-block-size: ${euiTheme.base * 15}px;
          /* Clips rows and dividers to the panel's rounded corners. */
          border-radius: inherit;
        `}
      >
        {items.map(
          ({ name, nameAppend, count, details, 'data-test-subj': dataTestSubj }, index) => {
            const label = (
              <>
                {name}
                {nameAppend && <> {nameAppend}</>}
              </>
            );
            return (
              <Fragment key={name}>
                {index > 0 && <EuiHorizontalRule margin="none" />}
                {details ? (
                  <EuiAccordion
                    id={`${accordionIdPrefix}-${name}`}
                    forceState={openRuleName === name ? 'open' : 'closed'}
                    onToggle={(isOpen) => setOpenRuleName(isOpen ? name : undefined)}
                    buttonContent={<EuiText size="s">{label}</EuiText>}
                    buttonProps={{ paddingSize: 's' }}
                    extraAction={
                      count && <EuiNotificationBadge color="subdued">{count}</EuiNotificationBadge>
                    }
                    css={{ paddingInline: euiTheme.size.s }}
                    data-test-subj={dataTestSubj}
                  >
                    {/* Indented by the accordion arrow's width and gap, so the content lines up
                        with the rule name above it. */}
                    <div
                      css={{
                        paddingBlock: euiTheme.size.s,
                        paddingInlineStart: `calc(${euiTheme.size.l} + ${euiTheme.size.xs})`,
                      }}
                    >
                      {details}
                    </div>
                  </EuiAccordion>
                ) : (
                  // Matches an accordion's padding, line height, and chevron indent, so rule names
                  // line up whether or not the rule opens.
                  <EuiText
                    size="s"
                    css={{
                      paddingBlock: euiTheme.size.s,
                      paddingInlineStart: `calc(${euiTheme.size.s} + ${euiTheme.size.l} + ${euiTheme.size.xs})`,
                      paddingInlineEnd: euiTheme.size.s,
                      lineHeight: euiTheme.size.l,
                    }}
                    data-test-subj={dataTestSubj}
                  >
                    {label}
                  </EuiText>
                )}
              </Fragment>
            );
          }
        )}
      </div>
    </EuiPanel>
  );
};

interface RuleChangeTableProps {
  'aria-label': string;
  nameHeader: string;
  valueHeader: string;
  rows: ReadonlyArray<{ name: string; value: ReactNode }>;
}

/**
 * The data sources a rule's change affects, and what each changes to. Built from flex layout with
 * table roles, so the borders sit only between rows.
 */
export const RuleChangeTable = ({
  'aria-label': ariaLabel,
  nameHeader,
  valueHeader,
  rows,
}: RuleChangeTableProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div role="table" aria-label={ariaLabel}>
      <EuiFlexGroup
        role="row"
        gutterSize="s"
        responsive={false}
        css={{ paddingBlockEnd: euiTheme.size.xs }}
      >
        <EuiFlexItem role="columnheader">
          <EuiFormLabel>{nameHeader}</EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem role="columnheader">
          <EuiFormLabel>{valueHeader}</EuiFormLabel>
        </EuiFlexItem>
      </EuiFlexGroup>
      {rows.map(({ name, value }) => (
        <EuiFlexGroup
          key={name}
          role="row"
          gutterSize="s"
          responsive={false}
          css={{ paddingBlock: euiTheme.size.xs }}
        >
          <EuiFlexItem role="cell">
            <EuiText size="xs">
              <EuiCode>{name}</EuiCode>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem role="cell">
            <EuiText size="xs">{value}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </div>
  );
};
