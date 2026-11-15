/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHealth,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEmptyValue } from '../helpers';
import { SEVERITY_COLORS, SEVERITY_LABELS, type InvestigationSeverityLevel } from './severity';

const CHANGE_SEVERITY_LABEL = i18n.translate('xpack.alertzero.severityPicker.changeSeverity', {
  defaultMessage: 'Change severity',
});

const NOT_SET_LABEL = i18n.translate('xpack.alertzero.severityPicker.notSet', {
  defaultMessage: 'Not set',
});

/** Most severe first, the order a user scans for. */
const SEVERITY_OPTIONS: readonly InvestigationSeverityLevel[] = [
  'critical',
  'high',
  'medium',
  'low',
];

const isSeverityLevel = (value: unknown): value is InvestigationSeverityLevel =>
  SEVERITY_OPTIONS.some((severity) => severity === value);

export interface SeverityPickerProps {
  /** Current severity from conversation metadata. Unknown values read as not set. */
  severity?: string;
  /** Called with the severity the user picked. Not called for the current one. */
  onChange: (severity: InvestigationSeverityLevel) => void;
  /** Shows the badge as busy, and keeps the popover closed. */
  isLoading?: boolean;
  /** Renders a plain, non-interactive badge. */
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

/**
 * A badge + popover severity selector, the counterpart of `StatusToggle`. The mutation is the
 * consuming component's, through `onChange`.
 */
export const SeverityPicker: React.FC<SeverityPickerProps> = ({
  severity,
  onChange,
  isLoading = false,
  isDisabled = false,
  'data-test-subj': dataTestSubj = 'severityPicker',
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const current = isSeverityLevel(severity) ? severity : undefined;

  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const handleSelect = useCallback(
    (next: InvestigationSeverityLevel) => {
      closePopover();
      if (next !== current) {
        onChange(next);
      }
    },
    [closePopover, current, onChange]
  );

  const color = current ? SEVERITY_COLORS[current] : 'hollow';
  const label = current ? SEVERITY_LABELS[current] : NOT_SET_LABEL;

  if (isDisabled) {
    return current ? (
      <EuiBadge color={color} data-test-subj={dataTestSubj}>
        {label}
      </EuiBadge>
    ) : (
      <span data-test-subj={dataTestSubj}>{getEmptyValue()}</span>
    );
  }

  const badge = (
    <EuiBadge
      iconType="chevronSingleDown"
      iconSide="right"
      onClick={isLoading ? () => {} : togglePopover}
      onClickAriaLabel={CHANGE_SEVERITY_LABEL}
      color={color}
      data-test-subj={dataTestSubj}
      style={isLoading ? { cursor: 'default', pointerEvents: 'none' } : undefined}
    >
      {label}
    </EuiBadge>
  );

  const items = SEVERITY_OPTIONS.map((option) => (
    <EuiContextMenuItem
      key={option}
      icon={option === current ? 'check' : 'empty'}
      onClick={() => handleSelect(option)}
      data-test-subj={`severityPickerOption-${option}`}
    >
      <EuiHealth color={SEVERITY_COLORS[option]}>{SEVERITY_LABELS[option]}</EuiHealth>
    </EuiContextMenuItem>
  ));

  return (
    <EuiPopover
      aria-label={CHANGE_SEVERITY_LABEL}
      anchorPosition="downLeft"
      button={badge}
      closePopover={closePopover}
      isOpen={isPopoverOpen && !isLoading}
      panelPaddingSize="none"
      data-test-subj={`${dataTestSubj}Popover`}
    >
      <EuiContextMenuPanel title={CHANGE_SEVERITY_LABEL} items={items} />
    </EuiPopover>
  );
};
