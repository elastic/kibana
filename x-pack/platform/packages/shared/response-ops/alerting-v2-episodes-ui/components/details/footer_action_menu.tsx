/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { EuiContextMenu, EuiWrappingPopover } from '@elastic/eui';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import type { FlyoutFooterMenuCustomItem, FlyoutFooterMenuItem } from '@kbn/flyout-template';
import type { EpisodeAction } from '../../actions/types';
import { buildEpisodeMenuPanels } from './build_episode_menu_panels';
import * as i18n from './translations';

export interface EpisodeFooterActionMenuProps {
  /** DOM node to anchor the popover to (the footer primary action button). */
  anchor: HTMLElement;
  /** Whether the popover is currently open. */
  isOpen: boolean;
  onClose: () => void;
  /**
   * Actions to list. Compatible actions are enabled. An action that fails
   * `isCompatible` is rendered disabled (with `disabledTooltip`) so a caller
   * can keep it visible via `showWhenDisabled`.
   */
  actions: EpisodeAction[];
  episodes: AlertEpisode[];
  /** Full episode details page href, rendered as the first menu item when present. */
  viewDetailsHref?: string | null;
  onSuccess?: () => void;
}

const isCustomItem = (item: FlyoutFooterMenuItem): item is FlyoutFooterMenuCustomItem =>
  typeof item.renderItem === 'function';

/** Primary flyout footer control listing every action available for an episode. */
export const EpisodeFooterActionMenu = ({
  anchor,
  isOpen,
  onClose,
  actions,
  episodes,
  viewDetailsHref,
  onSuccess,
}: EpisodeFooterActionMenuProps) => {
  const panels: EuiContextMenuPanelDescriptor[] = buildEpisodeMenuPanels({
    actions,
    episodes,
    viewDetailsHref,
    onSuccess,
  }).map((panel) => ({
    ...panel,
    items: panel.items.map((item): EuiContextMenuPanelItemDescriptor => {
      if (isCustomItem(item)) {
        return { key: item.key, renderItem: () => item.renderItem({ closeMenu: onClose }) };
      }
      const { onClick } = item as { onClick?: (event: React.MouseEvent) => void };
      if (!onClick) {
        return item;
      }
      return {
        ...item,
        onClick: (event: React.MouseEvent) => {
          onClose();
          onClick(event);
        },
      };
    }),
  }));

  return (
    <EuiWrappingPopover
      button={anchor}
      isOpen={isOpen}
      closePopover={onClose}
      aria-label={i18n.FLYOUT_TAKE_ACTION}
      anchorPosition="upRight"
      panelPaddingSize="s"
      data-test-subj="alertingV2EpisodeFlyoutTakeAction"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiWrappingPopover>
  );
};
