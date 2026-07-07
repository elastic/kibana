/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiContextMenuPanel } from '@elastic/eui';
import { ExpandableContextMenuPanelProvider } from '../contexts/expandable_context_menu_panel_context';

export interface ExpandableContextMenuPanelProps {
  items: React.ReactElement[];
  'data-test-subj'?: string;
}

/**
 * Drop-in replacement for EuiContextMenuPanel inside the row actions popover.
 * A menu item can call openPanel() to swap the actions menu out for arbitrary
 * inline content (e.g. the inline snooze form); a back button inside that
 * content calls closePanel() to restore the menu. EuiPopover unmounts its panel
 * content when it closes, so the swapped content resets back to the menu on the
 * next open without any extra handling.
 *
 * The hosting EuiPopover is the scroll container (maxHeight + overflowY:auto via
 * panelStyle), so an inline form's sticky header/footer stay pinned while the
 * body scrolls and the panel remains inside the viewport.
 */
export const ExpandableContextMenuPanel = ({
  items,
  'data-test-subj': testSubj = 'alertsTableActionsMenu',
}: ExpandableContextMenuPanelProps) => {
  const [panelContent, setPanelContent] = useState<React.ReactNode | null>(null);

  const openPanel = useCallback((panel: React.ReactNode) => {
    setPanelContent(panel);
  }, []);

  const closePanel = useCallback(() => {
    setPanelContent(null);
  }, []);

  return (
    <ExpandableContextMenuPanelProvider value={{ openPanel, closePanel }}>
      {panelContent ? (
        <EuiContextMenuPanel>{panelContent}</EuiContextMenuPanel>
      ) : (
        <EuiContextMenuPanel items={items} data-test-subj={testSubj} />
      )}
    </ExpandableContextMenuPanelProvider>
  );
};
