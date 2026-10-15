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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
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
  'aria-label': string;
  items: readonly RuleChangeListItem[];
}

/** Rules that a change affects, each opening to show what changes for the data sources it covers. */
export const RuleChangeList = ({ 'aria-label': ariaLabel, items }: RuleChangeListProps) => {
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
        aria-label={ariaLabel}
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
                    // The whole row opens the rule, with its count and a chevron at the end. EUI's
                    // own arrow only points right or down, so the chevron is drawn here instead.
                    arrowDisplay="none"
                    buttonContent={
                      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                        <EuiFlexItem>
                          <EuiText size="s">{label}</EuiText>
                        </EuiFlexItem>
                        {count && (
                          <EuiFlexItem grow={false}>
                            {/* An inline block keeps the row's hover and focus underline off the
                                badge. */}
                            <span css={{ display: 'inline-block' }}>
                              <EuiNotificationBadge color="subdued">{count}</EuiNotificationBadge>
                            </span>
                          </EuiFlexItem>
                        )}
                        <EuiFlexItem grow={false}>
                          <EuiIcon
                            type={openRuleName === name ? 'chevronSingleUp' : 'chevronSingleDown'}
                            aria-hidden={true}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    }
                    // The content fills the row, so the count and chevron sit at its end.
                    buttonContentClassName="eui-fullWidth"
                    buttonProps={{ paddingSize: 's' }}
                    css={{ paddingInline: euiTheme.size.s }}
                    data-test-subj={dataTestSubj}
                  >
                    {/* Lines up with the rule name above it. */}
                    <div css={{ padding: euiTheme.size.s }}>{details}</div>
                  </EuiAccordion>
                ) : (
                  // Matches an accordion's padding and line height, so rule names line up whether
                  // or not the rule opens.
                  <EuiText
                    size="s"
                    css={{
                      padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
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
