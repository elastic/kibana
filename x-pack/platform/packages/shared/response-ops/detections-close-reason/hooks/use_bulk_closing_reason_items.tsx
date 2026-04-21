/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { ContentPanelConfig, RenderContentPanelProps } from '../types';
import { ClosingReasonPanel } from '../components/closing_reason_panel';
import * as i18n from '../translations';

export const ALERT_CLOSING_REASON_PANEL_ID = 'ALERT_CLOSING_REASON_PANEL_ID';

interface OnSubmitClosingReasonParams extends RenderContentPanelProps {
  /**
   * The reason the item(s) are being closed
   */
  reason?: string;
}

interface UseBulkClosingReasonItemsProps {
  /**
   * Whether the closing reason action should be shown
   */
  isEnabled?: boolean;
  /**
   * Called once the user confirms the closing reason
   */
  onSubmitCloseReason?: (params: OnSubmitClosingReasonParams) => void;
  /** Optional label override for the confirm button */
  buttonLabel?: string;
}

/**
 * Returns menu items and panels to be used in a EuiContextMenu component
 */
export const useBulkClosingReasonItems = ({
  isEnabled = true,
  onSubmitCloseReason,
  buttonLabel,
}: UseBulkClosingReasonItemsProps = {}) => {
  const item = useMemo(
    () =>
      isEnabled
        ? {
            key: 'close-alert-with-reason',
            'data-test-subj': 'alert-close-context-menu-item',
            label: i18n.BULK_ACTION_CLOSE_SELECTED,
            panel: ALERT_CLOSING_REASON_PANEL_ID,
          }
        : undefined,
    [isEnabled]
  );

  const getRenderContent = useCallback(
    ({
      onSubmitCloseReason: onSubmitCloseReasonCb,
    }: {
      onSubmitCloseReason?: UseBulkClosingReasonItemsProps['onSubmitCloseReason'];
    }): ContentPanelConfig['renderContent'] => {
      return (renderProps: RenderContentPanelProps) => {
        const handleSubmit = (reason?: string) => {
          if (onSubmitCloseReasonCb) {
            onSubmitCloseReasonCb({
              ...renderProps,
              reason,
            });
          } else {
            renderProps.closePopoverMenu();
          }
        };
        return <ClosingReasonPanel buttonLabel={buttonLabel} onSubmit={handleSubmit} />;
      };
    },
    [buttonLabel]
  );

  const getPanel = useCallback(
    ({
      onSubmitCloseReason: onSubmitCloseReasonCb,
    }: {
      onSubmitCloseReason?: UseBulkClosingReasonItemsProps['onSubmitCloseReason'];
    }): ContentPanelConfig => ({
      id: ALERT_CLOSING_REASON_PANEL_ID,
      title: i18n.CLOSING_REASON_MENU_TITLE,
      renderContent: getRenderContent({ onSubmitCloseReason: onSubmitCloseReasonCb }),
    }),
    [getRenderContent]
  );

  const panels = useMemo<ContentPanelConfig[]>(
    () => (isEnabled ? [getPanel({ onSubmitCloseReason })] : []),
    [isEnabled, getPanel, onSubmitCloseReason]
  );

  const getPanels = useCallback(
    ({
      onSubmitCloseReason: onSubmitCloseReasonCb,
    }: {
      onSubmitCloseReason?: UseBulkClosingReasonItemsProps['onSubmitCloseReason'];
    }) => (isEnabled ? [getPanel({ onSubmitCloseReason: onSubmitCloseReasonCb })] : []),
    [getPanel, isEnabled]
  );

  return useMemo(
    () => ({
      item,
      panels,
      getPanels,
    }),
    [item, panels, getPanels]
  );
};
