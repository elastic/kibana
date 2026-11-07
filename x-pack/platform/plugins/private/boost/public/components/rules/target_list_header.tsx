/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { EuiButtonIcon, EuiPopover, EuiSwitch, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ShowHiddenSwitch } from '../hidden_data';

const OPTIONS_LABEL = i18n.translate('xpack.boost.targetListHeader.options', {
  defaultMessage: 'List options',
});

const SHOW_UNMATCHED_LABEL = i18n.translate('xpack.boost.targetListHeader.showUnmatched', {
  defaultMessage: 'Show unmatched',
});

// The height of a target list's header, for lists that size themselves to fit under it, with the
// space above it.
export const TARGET_LIST_HEADER_HEIGHT = 40;

interface ListOption {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Why the switch is off, if it is, which its tooltip says. */
  disabledReason?: string;
}

interface TargetListHeaderProps {
  /** The list's heading. */
  children: ReactNode;
  /** Whether the list's options are off, such as until a profile is selected. */
  isDisabled: boolean;
  /** Whether names the pattern doesn't match stay listed. */
  unmatched: ListOption;
  /** Whether hidden data sources are listed. */
  hidden: ListOption;
}

/**
 * The row atop a rule's list of targets: its heading, then a button for the list's options at the
 * end, which keeps the switches that show what the pattern doesn't match and hidden data sources out
 * of the way of the list. The list itself shows which are on: it marks the names that match apart
 * from the rest, badges hidden ones, and counts hidden ones it leaves out.
 */
export const TargetListHeader = ({
  children,
  isDisabled,
  unmatched,
  hidden,
}: TargetListHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: euiTheme.size.m,
        minBlockSize: euiTheme.size.xl,
        padding: `${euiTheme.size.s} ${euiTheme.size.base} 0`,
      }}
    >
      {children}
      <EuiPopover
        button={
          // Its label is also its name, so screen readers don't hear it twice.
          <EuiToolTip content={OPTIONS_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="ellipsis"
              size="xs"
              color="text"
              aria-label={OPTIONS_LABEL}
              isDisabled={isDisabled}
              onClick={() => setIsOpen((wasOpen) => !wasOpen)}
              data-test-subj="boostRuleListOptions"
            />
          </EuiToolTip>
        }
        isOpen={isOpen && !isDisabled}
        closePopover={() => setIsOpen(false)}
        anchorPosition="downRight"
        panelPaddingSize="s"
        aria-label={OPTIONS_LABEL}
      >
        {/* Each switch says why it's off, if it is, on hover. */}
        <div css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.s }}>
          <EuiToolTip content={unmatched.disabledReason} position="left">
            <EuiSwitch
              compressed
              label={SHOW_UNMATCHED_LABEL}
              checked={unmatched.checked}
              disabled={unmatched.disabledReason !== undefined}
              onChange={(event) => unmatched.onChange(event.target.checked)}
              data-test-subj="boostRuleShowUnmatched"
            />
          </EuiToolTip>
          <EuiToolTip content={hidden.disabledReason} position="left">
            <ShowHiddenSwitch
              checked={hidden.checked}
              onChange={hidden.onChange}
              disabled={hidden.disabledReason !== undefined}
              data-test-subj="boostRuleShowHidden"
            />
          </EuiToolTip>
        </div>
      </EuiPopover>
    </div>
  );
};
