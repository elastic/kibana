/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import {
  EuiPopover,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  type EuiToolTipRef,
  useEuiTheme,
  useIsDarkMode,
} from '@elastic/eui';
import { getAgeRangeLabel } from './strings';
import { getPeriodBarStyles } from './styles';
import type { LifecycleTimelineTrackItem } from './types';

interface LifecycleTimelinePeriodProps {
  item: LifecycleTimelineTrackItem;
  testSubjPrefix: string;
}

export const LifecycleTimelinePeriodBar = ({
  item,
  testSubjPrefix,
}: LifecycleTimelinePeriodProps) => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useIsDarkMode();
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<EuiToolTipRef>(null);

  const { period, startLabel, endLabel } = item;
  const {
    label,
    color,
    size,
    tooltipContent,
    popoverContent,
    popoverProps,
    onClick,
    isHighlighted,
    testSubjects,
  } = period;
  const hasTooltip = tooltipContent !== undefined;
  const hasPopover = popoverContent !== undefined;
  const isClickable = hasPopover || onClick !== undefined;

  // Resets during render so the popover doesn't reopen when its content comes back.
  if (!hasPopover && isOpen) setIsOpen(false);
  const isPopoverOpen = hasPopover && isOpen;
  const closePopover = () => setIsOpen(false);

  const testSubj = testSubjects?.bar ?? `${testSubjPrefix}-period-${period.id}`;
  const nameTestSubj = testSubjects?.name ?? `${testSubj}-name`;
  const sizeTestSubj = testSubjects?.size ?? `${testSubj}-size`;

  const styles = getPeriodBarStyles({
    euiTheme,
    isDarkMode,
    backgroundColor: color,
    isHighlighted: Boolean(isHighlighted) || isPopoverOpen,
    isClickable,
  });

  const content = (
    <>
      <EuiText size="xs" color="inherit" css={styles.name} data-test-subj={nameTestSubj}>
        {label}
      </EuiText>
      <EuiText
        size="xs"
        color="inherit"
        css={styles.size}
        data-test-subj={size ? sizeTestSubj : undefined}
      >
        {size}
      </EuiText>
      <EuiScreenReaderOnly>
        <span>{getAgeRangeLabel(startLabel, endLabel)}</span>
      </EuiScreenReaderOnly>
    </>
  );

  const bar = isClickable ? (
    <button
      type="button"
      css={styles.bar}
      data-test-subj={testSubj}
      onClick={() => {
        if (hasPopover) {
          if (!isOpen) tooltipRef.current?.hideToolTip();
          setIsOpen(!isOpen);
        }
        onClick?.();
      }}
      aria-expanded={hasPopover ? isPopoverOpen : undefined}
      aria-haspopup={hasPopover ? 'dialog' : undefined}
    >
      {content}
    </button>
  ) : (
    <div css={styles.bar} tabIndex={hasTooltip ? 0 : undefined} data-test-subj={testSubj}>
      {content}
    </div>
  );

  const barWithTooltip = hasTooltip ? (
    // While the popover is open, an empty tooltip doesn't show over it.
    <EuiToolTip
      ref={tooltipRef}
      title={isPopoverOpen ? undefined : label}
      content={isPopoverOpen ? undefined : tooltipContent}
      display="block"
      position="top"
    >
      {bar}
    </EuiToolTip>
  ) : (
    bar
  );

  if (!isClickable) return barWithTooltip;

  // Clickable bars always render the popover, even with no content, so adding or removing it keeps the bar mounted.
  return (
    <EuiPopover
      button={barWithTooltip}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="upCenter"
      display="block"
      aria-label={popoverProps?.['aria-labelledby'] ? undefined : label}
      {...popoverProps}
    >
      {typeof popoverContent === 'function' ? popoverContent({ closePopover }) : popoverContent}
    </EuiPopover>
  );
};
