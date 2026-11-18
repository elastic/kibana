/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiPopover, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DestinationFailedView } from '../../../../../services/unit_stats_client/types';
import { DestinationFailurePopoverSummary } from '../../../../streams_layout/destinations/destination_failure_popover_summary';
import { STATS_DEFAULT_WINDOW_MINUTES } from '../../../../unit_stats/state_management/constants';

/**
 * The badge that marks a destination that is rejecting what it is sent, such as refused
 * credentials, and the popover with the failures that hover or focus opens. The popover stays open
 * while the pointer is on the badge or inside the popover, and closes when the pointer leaves both
 * or the focus leaves the badge. It tells its parent when it opens and closes. A click on the badge
 * is not handled, so it reaches the node and opens its flyout, as a click anywhere on the node
 * does.
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
  const badgeRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const setPanel = useCallback((node: HTMLElement | null) => {
    panelRef.current = node;
  }, []);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  // The panel touches the badge, so the pointer moves from one to the other with nothing between.
  // It stays open while the pointer is on either, and closes when the pointer goes anywhere else.
  const closeUnlessMovingTo = useCallback(
    (target: EventTarget | null, inside: Array<HTMLElement | null>) => {
      if (target instanceof Node && inside.some((element) => element?.contains(target))) return;
      setIsOpen(false);
    },
    []
  );

  return (
    <EuiPopover
      // Keeps React Flow from dragging or panning the canvas when the pointer is on the icon.
      className="nodrag nopan"
      isOpen={isOpen}
      closePopover={close}
      anchorPosition="upCenter"
      attachToAnchor
      offset={0}
      panelPaddingSize="s"
      ownFocus={false}
      repositionOnScroll
      panelRef={setPanel}
      panelProps={{
        'data-test-subj': `${dataTestSubj}Popover`,
        onMouseLeave: (event) => closeUnlessMovingTo(event.relatedTarget, [badgeRef.current]),
      }}
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
          onMouseEnter={(event) => {
            badgeRef.current = event.currentTarget;
            open();
          }}
          onMouseLeave={(event) => closeUnlessMovingTo(event.relatedTarget, [panelRef.current])}
          onFocus={(event) => {
            badgeRef.current = event.currentTarget;
            open();
          }}
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
