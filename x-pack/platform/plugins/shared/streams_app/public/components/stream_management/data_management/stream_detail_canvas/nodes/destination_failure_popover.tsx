/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiPopover, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DestinationFailedView } from '../../../../../services/unit_stats_client/types';
import { DestinationFailurePopoverSummary } from '../../../../unit_stats/destination_failure_popover_summary';
import { STATS_DEFAULT_WINDOW_MINUTES } from '../../../../unit_stats/state_management/constants';

/**
 * The badge that marks a destination that is rejecting what it is sent, such as refused
 * credentials, and the popover with the failures that hover or focus opens. It tells its parent
 * when it opens and closes. A click on the badge is not handled, so it reaches the node and opens
 * its flyout, as a click anywhere on the node does.
 */
export const DestinationFailurePopover = ({
  failed,
  onOpenChange,
  dataTestSubj,
}: {
  failed: DestinationFailedView;
  onOpenChange?: (isOpen: boolean) => void;
  dataTestSubj: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const label = i18n.translate('xpack.streams.canvas.destinationNode.failuresAriaLabel', {
    defaultMessage: 'Delivery failures',
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <EuiPopover
      // Keeps React Flow from dragging or panning the canvas when the pointer is on the icon.
      className="nodrag nopan"
      isOpen={isOpen}
      closePopover={close}
      anchorPosition="upCenter"
      panelPaddingSize="s"
      ownFocus={false}
      repositionOnScroll
      panelProps={{ 'data-test-subj': `${dataTestSubj}Popover` }}
      aria-label={label}
      // A click anywhere on the icon and its label closes the popover, and still reaches the node.
      onClick={close}
      button={
        <EuiBadge
          color="danger"
          iconType="warning"
          // Focusable, as `EuiIconTip` is, so that the keyboard opens the popover too.
          tabIndex={0}
          data-test-subj={dataTestSubj}
          onMouseEnter={open}
          onMouseLeave={close}
          onFocus={open}
          onBlur={close}
        >
          {i18n.translate('xpack.streams.canvas.destinationNode.failuresBadge', {
            defaultMessage: 'Failures',
          })}
        </EuiBadge>
      }
    >
      <div
        css={css`
          inline-size: ${euiTheme.base * 23}px;
          max-inline-size: 100%;
        `}
      >
        <DestinationFailurePopoverSummary failed={failed} minutes={STATS_DEFAULT_WINDOW_MINUTES} />
      </div>
    </EuiPopover>
  );
};
