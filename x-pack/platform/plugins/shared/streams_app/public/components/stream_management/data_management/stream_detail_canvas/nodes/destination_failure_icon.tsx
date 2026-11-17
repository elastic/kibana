/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiPopover, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DestinationFailedView } from '../../../../../services/unit_stats_client/types';
import { DestinationFailurePopoverSummary } from '../../../../unit_stats/destination_failure_popover_summary';
import { withPlaceholderFailureSeries } from '../../../../unit_stats/placeholder_failure_series';
import { STATS_DEFAULT_WINDOW_MINUTES } from '../../../../unit_stats/state_management/constants';

/** The popover closes this long after the pointer leaves, so moving from the icon onto it is safe. */
const CLOSE_DELAY_MS = 150;

/**
 * Marks a destination that is rejecting what it is sent, such as refused credentials. Hover or
 * focus opens a popover with the failures. It is a popover and not a tooltip so that it follows the
 * theme of the page, where a tooltip is always the inverse of it. A click on the icon is not
 * handled, so it reaches the node and opens its flyout, as a click anywhere on the node does. It is
 * a different problem from `StatsProblemIcon`: those say that the stats could not be loaded, and
 * this one says that the stats are loaded and show failures.
 */
export const DestinationFailureIcon = ({
  failed,
  dataTestSubj,
}: {
  failed: DestinationFailedView;
  dataTestSubj: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const label = i18n.translate('xpack.streams.canvas.destinationNode.failuresAriaLabel', {
    defaultMessage: 'Delivery failures',
  });
  // TEMPORARY: the API sends no series for each class yet, so this makes one up so that the
  // sparkline can be designed. Remove it, and `placeholder_failure_series.ts`, when the API sends it.
  const failedWithTrend = useMemo(() => withPlaceholderFailureSeries(failed), [failed]);
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const open = useCallback(() => {
    clearTimeout(closeTimer.current);
    setIsOpen(true);
  }, []);

  const closeNow = useCallback(() => {
    clearTimeout(closeTimer.current);
    setIsOpen(false);
  }, []);

  const closeSoon = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  return (
    <EuiPopover
      // Keeps React Flow from dragging or panning the canvas when the pointer is on the icon.
      className="nodrag nopan"
      isOpen={isOpen}
      closePopover={closeNow}
      anchorPosition="upCenter"
      panelPaddingSize="s"
      ownFocus={false}
      repositionOnScroll
      panelProps={{
        onMouseEnter: open,
        onMouseLeave: closeSoon,
        'data-test-subj': `${dataTestSubj}Popover`,
      }}
      aria-label={label}
      // A click anywhere on the icon and its label closes the popover, and still reaches the node.
      onClick={closeNow}
      button={
        <EuiBadge
          color="danger"
          iconType="warning"
          // Focusable, as `EuiIconTip` is, so that the keyboard opens the popover too.
          tabIndex={0}
          data-test-subj={dataTestSubj}
          onMouseEnter={open}
          onMouseLeave={closeSoon}
          onFocus={open}
          onBlur={closeSoon}
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
        <DestinationFailurePopoverSummary
          failed={failedWithTrend}
          minutes={STATS_DEFAULT_WINDOW_MINUTES}
        />
      </div>
    </EuiPopover>
  );
};
