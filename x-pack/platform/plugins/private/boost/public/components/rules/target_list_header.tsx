/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { ShowHiddenSwitch } from '../hidden_data';

// The height of a target list's header, with the space above it, for lists that size themselves to
// fit under it: EUI's small tabs are 32px tall, and a heading is made as tall.
export const TARGET_LIST_HEADER_HEIGHT = 40;

interface TargetListHeaderProps {
  /** The list's tabs, or its heading. */
  children: ReactNode;
  /** Whether the lists show hidden data sources. */
  includesHidden: boolean;
  onIncludesHiddenChange: (includesHidden: boolean) => void;
  /** Whether the switch is off, such as until a profile is selected. */
  isShowHiddenDisabled: boolean;
}

/**
 * The row atop a rule's list of targets: its tabs or heading, then the switch that shows hidden data
 * sources at the end, so the pattern's matches and the list to select from look alike.
 */
export const TargetListHeader = ({
  children,
  includesHidden,
  onIncludesHiddenChange,
  isShowHiddenDisabled,
}: TargetListHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    // The row draws the tabs' border, as the tabs do, so it runs under the switch too, and under a
    // heading alike. A margin rather than padding, so the border stops at the panel's padding.
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
      <ShowHiddenSwitch
        checked={includesHidden}
        onChange={onIncludesHiddenChange}
        disabled={isShowHiddenDisabled}
        labelSize="xs"
        isSubdued
        data-test-subj="boostRuleShowHidden"
      />
    </div>
  );
};
