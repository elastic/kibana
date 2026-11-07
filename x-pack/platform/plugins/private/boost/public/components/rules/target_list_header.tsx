/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiSwitch, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ShowHiddenSwitch } from '../hidden_data';

const SHOW_UNMATCHED_LABEL = i18n.translate('xpack.boost.targetListHeader.showUnmatched', {
  defaultMessage: 'Show unmatched',
});

// The height of a target list's header, for lists that size themselves to fit under it, with the
// space above it.
export const TARGET_LIST_HEADER_HEIGHT = 40;

interface TargetListHeaderProps {
  /** The list's heading. */
  children: ReactNode;
  /** A switch before the one for hidden data sources that keeps names the pattern doesn't match listed. */
  unmatched: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled: boolean;
  };
  /** Whether the lists show hidden data sources. */
  includesHidden: boolean;
  onIncludesHiddenChange: (includesHidden: boolean) => void;
  /** Whether the switch is off, such as until a profile is selected. */
  isShowHiddenDisabled: boolean;
}

/**
 * The row atop a rule's list of targets: its heading, then the switches that show what the pattern
 * doesn't match and hidden data sources at the end.
 */
export const TargetListHeader = ({
  children,
  unmatched,
  includesHidden,
  onIncludesHiddenChange,
  isShowHiddenDisabled,
}: TargetListHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize } = useEuiFontSize('xs');
  return (
    // The row draws a border under the heading and switches. A margin rather than padding, so the
    // border stops at the panel's padding.
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: euiTheme.size.m,
        minBlockSize: euiTheme.size.xl,
        margin: `${euiTheme.size.s} ${euiTheme.size.base} 0`,
        boxShadow: `inset 0 -${euiTheme.border.width.thin} 0 ${euiTheme.border.color}`,
      }}
    >
      {children}
      <div css={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.m }}>
        {/* Like the switch for hidden data sources, its label is subdued unless it's off. */}
        <EuiSwitch
          compressed
          label={SHOW_UNMATCHED_LABEL}
          labelProps={{
            css: {
              fontSize,
              color: unmatched.disabled ? undefined : euiTheme.colors.textSubdued,
            },
          }}
          checked={unmatched.checked}
          disabled={unmatched.disabled}
          onChange={(event) => unmatched.onChange(event.target.checked)}
          data-test-subj="boostRuleShowUnmatched"
        />
        <ShowHiddenSwitch
          checked={includesHidden}
          onChange={onIncludesHiddenChange}
          disabled={isShowHiddenDisabled}
          labelSize="xs"
          isSubdued
          data-test-subj="boostRuleShowHidden"
        />
      </div>
    </div>
  );
};
