/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiBadge, EuiListGroup, EuiListGroupItem, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const CHANGE_STATUS_LABEL = i18n.translate('xpack.alertzero.statusToggle.changeStatus', {
  defaultMessage: 'Change status',
});

const STATUS_OPTIONS = ['open', 'closed'] as const;

const STATUS_CONFIG: Record<'open' | 'closed', { label: string; color: 'primary' | 'default' }> = {
  open: {
    label: i18n.translate('xpack.alertzero.statusToggle.open', { defaultMessage: 'Open' }),
    color: 'primary',
  },
  closed: {
    label: i18n.translate('xpack.alertzero.statusToggle.closed', { defaultMessage: 'Closed' }),
    color: 'default',
  },
};

export interface StatusToggleProps {
  /** Current status string from conversation metadata. Defaults to `'open'` when absent. */
  status?: string;
  /** Called when the user selects a new status. Receives `'open'` or `'closed'`. */
  onChange: (newStatus: 'open' | 'closed') => void;
  /** When true, the badge is shown in a loading state and the popover cannot be opened. */
  isLoading?: boolean;
  /** When true, the toggle is rendered as a plain non-interactive badge. */
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

/**
 * A badge + popover status selector.
 *
 * Shows the current status as a coloured badge with a chevron. Clicking it opens a popover
 * listing Open and Closed, with a check mark on the current one. Picking the other status calls
 * `onChange`; picking the current one just closes the popover. All mutation logic lives in the
 * consuming component that supplies `onChange`.
 */
export const StatusToggle: React.FC<StatusToggleProps> = ({
  status,
  onChange,
  isLoading = false,
  isDisabled = false,
  'data-test-subj': dataTestSubj = 'statusToggle',
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const currentStatus: 'open' | 'closed' = status === 'closed' ? 'closed' : 'open';
  const config = STATUS_CONFIG[currentStatus];

  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const handleSelect = useCallback(
    (newStatus: 'open' | 'closed') => {
      closePopover();
      onChange(newStatus);
    },
    [closePopover, onChange]
  );

  // Read-only badge when the user cannot change status.
  if (isDisabled) {
    return (
      <EuiBadge color={config.color} data-test-subj={dataTestSubj}>
        {config.label}
      </EuiBadge>
    );
  }

  const badge = (
    <EuiBadge
      iconType="chevronSingleDown"
      iconSide="right"
      onClick={isLoading ? () => {} : togglePopover}
      onClickAriaLabel={CHANGE_STATUS_LABEL}
      color={config.color}
      data-test-subj={dataTestSubj}
      style={isLoading ? { cursor: 'default', pointerEvents: 'none' } : undefined}
    >
      {config.label}
    </EuiBadge>
  );

  return (
    <EuiPopover
      aria-label={CHANGE_STATUS_LABEL}
      anchorPosition="downLeft"
      button={badge}
      closePopover={closePopover}
      isOpen={isPopoverOpen && !isLoading}
      panelPaddingSize="s"
      panelStyle={{ minWidth: 140 }}
      data-test-subj={`${dataTestSubj}Popover`}
    >
      <EuiListGroup aria-label={CHANGE_STATUS_LABEL}>
        {STATUS_OPTIONS.map((option) => {
          const isSelected = option === currentStatus;
          return (
            <EuiListGroupItem
              key={option}
              // `empty` keeps the labels aligned when only the selected row shows a check.
              iconType={isSelected ? 'check' : 'empty'}
              isActive={isSelected}
              label={STATUS_CONFIG[option].label}
              onClick={() => (isSelected ? closePopover() : handleSelect(option))}
              data-test-subj={option === 'open' ? 'statusToggleOpen' : 'statusToggleClosed'}
            />
          );
        })}
      </EuiListGroup>
    </EuiPopover>
  );
};
