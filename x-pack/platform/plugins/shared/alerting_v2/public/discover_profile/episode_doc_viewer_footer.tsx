/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import type { FlyoutFooterMenuItem, FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions/types';
import type { AlertEpisodeDetailsServices } from '@kbn/alerting-v2-episodes-ui/components/details/types';
import { buildEpisodeMenuPanels } from '@kbn/alerting-v2-episodes-ui/components/details/build_episode_menu_panels';
import {
  FLYOUT_CLOSE,
  FLYOUT_TAKE_ACTION,
} from '@kbn/alerting-v2-episodes-ui/components/details/translations';
import { useEpisodeDetailsHeaderData } from '@kbn/alerting-v2-episodes-ui/hooks/use_episode_details_header_data';

type CustomMenuItem = Extract<FlyoutFooterMenuItem, { key: string }>;

const isCustomItem = (item: FlyoutFooterMenuItem): item is CustomMenuItem =>
  typeof item.renderItem === 'function';

// The context menu calls renderItem outside of render, so a component lets its hooks run.
const CustomMenuItemContent = ({
  renderItem,
  closeMenu,
}: {
  renderItem: CustomMenuItem['renderItem'];
  closeMenu: () => void;
}) => <>{renderItem({ closeMenu })}</>;

const toContextMenuPanels = (
  panels: FlyoutFooterMenuPanel[],
  closeMenu: () => void
): EuiContextMenuPanelDescriptor[] =>
  panels.map(({ items, ...panel }) => ({
    ...panel,
    items: items.map((item) => {
      if (isCustomItem(item)) {
        return {
          key: `customItem:${item.key}`,
          renderItem: () => (
            <CustomMenuItemContent renderItem={item.renderItem} closeMenu={closeMenu} />
          ),
        };
      }
      if (item.isSeparator) {
        return item;
      }
      const { onClick, href } = item;
      if (item.panel != null || (!onClick && !href)) {
        return item;
      }
      return {
        ...item,
        onClick: (event: React.MouseEvent<Element, globalThis.MouseEvent>) => {
          onClick?.(event);
          closeMenu();
        },
      };
    }),
  }));

interface TakeActionMenuProps {
  panels: FlyoutFooterMenuPanel[];
}

/**
 * The "Take action" menu of the alerts page flyout footer. The template only renders it
 * inside its own flyout, so this rebuilds it with the same EUI parts.
 */
const TakeActionMenu = ({ panels }: TakeActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  // Remounting the menu on each open resets it to the first panel.
  const [openCount, setOpenCount] = useState(0);

  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => {
    if (!isOpen) setOpenCount((count) => count + 1);
    setIsOpen((open) => !open);
  }, [isOpen]);

  const contextMenuPanels = useMemo(
    () => toContextMenuPanels(panels, closeMenu),
    [panels, closeMenu]
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={closeMenu}
      anchorPosition="upRight"
      panelPaddingSize="none"
      aria-label={FLYOUT_TAKE_ACTION}
      button={
        <EuiButton
          fill
          size="m"
          iconType={isOpen ? 'chevronSingleUp' : 'chevronSingleDown'}
          iconSide="right"
          onClick={toggleMenu}
          aria-haspopup="dialog"
          data-test-subj="alertingV2EpisodeDocViewerTakeActionButton"
        >
          {FLYOUT_TAKE_ACTION}
        </EuiButton>
      }
    >
      <EuiContextMenu key={openCount} initialPanelId={panels[0]?.id} panels={contextMenuPanels} />
    </EuiPopover>
  );
};

export interface EpisodeDocViewerFooterProps {
  episodeId: string;
  groupHash: string | undefined;
  services: Pick<
    AlertEpisodeDetailsServices,
    'data' | 'http' | 'expressions' | 'spaces' | 'uiSettings' | 'userProfile'
  >;
  actions?: EpisodeAction[];
  viewDetailsHref: string | null;
  onActionSuccess: () => void;
  /** Hidden when the host offers no way to close the flyout. */
  onClose?: () => void;
}

/** Renders the alerts page flyout footer in the Discover document viewer. */
export const EpisodeDocViewerFooter = ({
  episodeId,
  groupHash,
  services,
  actions,
  viewDetailsHref,
  onActionSuccess,
  onClose,
}: EpisodeDocViewerFooterProps) => {
  const { episode, isActionStateLoaded } = useEpisodeDetailsHeaderData({
    episodeId,
    groupHash,
    services,
  });

  // Same as the alerts page: the actions depend on the action state, so they wait for it.
  const episodes = useMemo(
    () => (episode && isActionStateLoaded ? [episode] : []),
    [episode, isActionStateLoaded]
  );
  const panels = useMemo(() => {
    const menuActions =
      actions && episodes.length
        ? actions.filter(
            (action) =>
              action.isCompatible({ episodes }) || Boolean(action.showWhenDisabled?.({ episodes }))
          )
        : [];
    return buildEpisodeMenuPanels({
      actions: menuActions,
      episodes,
      viewDetailsHref,
      onSuccess: onActionSuccess,
    });
  }, [actions, episodes, viewDetailsHref, onActionSuccess]);

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      gutterSize="s"
      responsive={false}
      data-test-subj="alertingV2EpisodeDocViewerFooter"
    >
      {onClose && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onClose} data-test-subj="alertingV2EpisodeDocViewerCloseButton">
            {FLYOUT_CLOSE}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      {panels.length > 0 && (
        <EuiFlexItem grow={false}>
          <TakeActionMenu panels={panels} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
